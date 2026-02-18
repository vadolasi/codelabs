<script lang="ts">
import { Home, MonitorPlay, Play, Share2, Square } from "@lucide/svelte"
import { io, type Socket } from "socket.io-client"
import type { Component } from "svelte"
import { onMount, tick } from "svelte"
import { Pane, Splitpanes } from "svelte-splitpanes"
  import { dev } from "$app/environment";
import type BaseEngine from "$lib/engine/base.svelte"
import httpClient from "$lib/httpClient"
import parser from "$lib/socketio-msgpack-parser"
import Editor from "./Editor.svelte"
import editorState, {
  engine,
} from "./editorState.svelte"
import FileTree from "./FileTree/index.svelte"
import Previewers from "./Previewers/index.svelte"
import ShareModal from "./ShareModal.svelte"
import type {
  ClientToServerEvents,
  ServerToClientEvents
} from "./socket-io-types"
import Visualizer from "./Visualizer.svelte"

// Componentes carregados dinamicamente com tipagem correta
const TerminalPTY = $derived.by(async () => {
  if (engine.current?.capabilities.terminal === "pty") {
    const mod = await import("./Terminal.svelte")
    return mod.default as Component
  }
  return null
})

const TerminalSimple = $derived.by(async () => {
  if (engine.current?.capabilities.terminal === "simple") {
    const mod = await import("./SimpleTerminal.svelte")
    return mod.default as Component
  }
  return null
})

const {
  engine: loadedEngine,
  workspace
}: {
  engine: BaseEngine
  workspace: Exclude<
    Awaited<
      ReturnType<ReturnType<typeof httpClient.workspaces>["get"]>
    >["data"],
    null | undefined
  >["workspace"]
} = $props()

$effect(() => {
  engine.current = loadedEngine
})

const currentWorkspace = $derived.by(() => workspace)

$effect(() => {
  const unsubscribers: Array<() => void> = []
  const doc = editorState.loroDoc
  const ephemeral = editorState.ephemeralStore

  if (loadedEngine.capabilities.preview) {
    unsubscribers.push(
      loadedEngine.on("preview-open", ({ port, url }) => {
        editorState.addPreviewer(port, url)
      })
    )
    unsubscribers.push(
      loadedEngine.on("preview-close", ({ port }) => {
        editorState.removePreviewer(port)
      })
    )
  }

  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
    dev ? "http://localhost:5174" : window.location.origin,
    {
      parser,
      withCredentials: true,
      query: {
        workspaceId: currentWorkspace.id
      }
    }
  )

  socket.on("connect", () => {
    // 1. Sincroniza versão atual com o servidor ao conectar
    socket.emit("sync", doc.export({ mode: "snapshot" }), (missing: Uint8Array) => {
      if (missing.length > 0) {
        doc.import(missing)
      }
    })
  });

  socket.on("connect_error", (err) => {
    console.error("[Socket] Erro de conexão:", err.message);
  });

  socket.on("loro-update", (update) => {
    const status = doc.import(update)
    // 2. Se houver atualizações pendentes (faltando dependências), solicita sincronização completa
    if (status.pending) {
      socket.emit("sync", doc.export({ mode: "snapshot" }), (missing: Uint8Array) => {
        doc.import(missing)
      })
    }
  })

  socket.on("ephemeral-update", (update) => {
    ephemeral.apply(update)
  })
  
  const unsubscribeLoro = doc.subscribeLocalUpdates((update) => {
    socket.emit("loro-update", currentWorkspace.id, update)
  })
  
  const unsubscribeEphemeral = ephemeral.subscribeLocalUpdates((update) => {
    socket.emit("ephemeral-update", currentWorkspace.id, update)
  })

  return () => {
    socket.disconnect()
    unsubscribeLoro()
    unsubscribeEphemeral()
    for (const unsubscribe of unsubscribers) {
      unsubscribe()
    }
  }
})

const terminals: string[] = $state([])
let currentTerminal: string | null = $state(null)

function newTerminal() {
  if (!loadedEngine.capabilities.terminal) {
    return
  }
  currentTerminal = Math.random().toString(36).substring(2, 15)
  terminals.push(currentTerminal)
}

function setCurrentTerminal(terminal: string) {
  currentTerminal = terminal
}

function closeTerminal(terminal: string) {
  const index = terminals.indexOf(terminal)
  if (index > -1) {
    terminals.splice(index, 1)
  }
  if (currentTerminal === terminal) {
    currentTerminal = terminals[0] || null
  }
}

async function runCurrentFile() {
  if (!engine.current?.run || !editorState.currentTab) return
  if (engine.current.isRunning) return
  
  if (terminals.length === 0) {
    newTerminal()
  }

  // Detecção inteligente de Turtle: Abre apenas se houver 'import turtle'
  const item = editorState.filesMap.get(editorState.currentTab!)
  const itemData = item?.get("data") as any;
  const content = itemData?.content || "";
  const usesTurtle = content.includes('import turtle') || content.includes('from turtle import');

  if (usesTurtle && engine.current.capabilities.visualizer) {
    showVisualizer = true;
    // Força o Svelte a processar a mudança de estado e montar o componente Visualizer
    await tick();
    // Pequeno delay extra para garantir que o elemento está no DOM
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  await engine.current.run(editorState.currentTab)
}

async function interruptExecution() {
  if (engine.current?.interrupt) {
    engine.current.interrupt()
  }
}

let showShareModal = $state(false)
let showVisualizer = $state(false)
</script>

<div class="h-screen w-screen flex flex-col bg-base-300 text-base-content">
  <div class="w-full border-b border-base-200/60 bg-base-200/80 backdrop-blur-md">
    <div class="px-3 py-2 flex items-center gap-3">
      <a href="/" class="btn btn-ghost btn-sm" aria-label="Home">
        <Home class="h-4 w-4" />
      </a>
      <div class="flex items-center gap-2">
        <div class="badge badge-primary badge-outline">Workspace</div>
        <div class="text-sm font-medium text-base-content/90">{currentWorkspace.name}</div>
      </div>
      <div class="ml-auto flex items-center gap-2">
        {#if engine.current?.canRun?.(editorState.currentTab || "")}
          {#if engine.current.isRunning}
            <button type="button" class="btn btn-error btn-sm gap-2" onclick={interruptExecution}>
              <Square class="w-4 h-4" />
              Interromper
            </button>
          {:else}
            <button type="button" class="btn btn-success btn-sm gap-2" onclick={runCurrentFile}>
              <Play class="w-4 h-4" />
              Executar
            </button>
          {/if}
        {/if}
        {#if engine.current?.capabilities.visualizer}
          <button
            type="button"
            class="btn btn-ghost btn-sm gap-2"
            class:btn-active={showVisualizer}
            onclick={() => (showVisualizer = !showVisualizer)}
          >
            <MonitorPlay class="w-4 h-4" />
            Visualizar
          </button>
        {/if}
        <button type="button" class="btn btn-ghost btn-sm gap-2" onclick={() => (showShareModal = true)}>
          <Share2 class="w-4 h-4" />
          Compartilhar
        </button>
      </div>
    </div>
  </div>
  <Splitpanes theme="modern-theme" class="w-full h-full flex-1 overflow-hidden">
    <Pane maxSize={70} size={20}>
      <div class="h-full flex flex-col border-r border-base-200/60 bg-base-300">
        <div class="px-3 py-2 text-xs uppercase tracking-widest text-base-content/60 border-b border-base-200/60">
          Arquivos
        </div>
        <div class="flex-1 min-h-0">
          <FileTree />
        </div>
      </div>
    </Pane>
    <Pane>
      {#if engine.current?.capabilities.terminal === "pty"}
        <Splitpanes theme="modern-theme" horizontal={true}>
          <Pane>
            <div class="h-full border-b border-base-200/60 bg-base-300">
              <Editor />
            </div>
          </Pane>
          <Pane class="flex flex-col">
            <div class="shrink-0 flex items-center gap-2 px-2 py-1 bg-base-200/70 border-b border-base-200/60">
              {#if terminals.length > 0}
                <div class="flex flex-wrap gap-1">
                  {#each terminals as terminal, index (terminal)}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <div
                      role="button"
                      tabindex="0"
                      class="btn btn-xs gap-2 normal-case"
                      class:btn-primary={terminal === currentTerminal}
                      class:btn-ghost={terminal !== currentTerminal}
                      onclick={() => setCurrentTerminal(terminal)}
                    >
                      <span>Terminal {index + 1}</span>
                      <button
                        type="button"
                        aria-label="Close tab"
                        class="btn btn-ghost btn-xs p-0 h-4 min-h-0"
                        onclick={() => closeTerminal(terminal)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3">
                          <title>Close</title>
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  {/each}
                </div>
              {/if}
              <button type="button" class="btn btn-ghost btn-xs" onclick={newTerminal}>
                {#if terminals.length > 0}
                  +
                {:else}
                  Novo terminal
                {/if}
              </button>
            </div>
            {#each terminals as terminal (terminal)}
              <div class="flex-1 overflow-hidden" class:hidden={currentTerminal !== terminal}>
                {#if engine.current?.capabilities.terminal === "pty"}
                  {#await TerminalPTY then Component}
                    {#if Component}
                      <Component />
                    {/if}
                  {/await}
                {:else if engine.current?.capabilities.terminal === "simple"}
                  {#await TerminalSimple then Component}
                    {#if Component}
                      <Component />
                    {/if}
                  {/await}
                {/if}
              </div>
            {/each}
          </Pane>
        </Splitpanes>
      {:else if engine.current?.capabilities.terminal === "simple"}
        <Splitpanes theme="modern-theme" horizontal={true}>
          <Pane>
            <div class="h-full border-b border-base-200/60 bg-base-300">
              <Editor />
            </div>
          </Pane>
          <Pane size={30} class="flex flex-col">
            <div class="shrink-0 flex items-center gap-2 px-3 py-2 bg-base-200/70 border-b border-base-200/60 text-xs uppercase tracking-wider text-base-content/60">
              Terminal
            </div>
            <div class="flex-1 overflow-hidden">
              {#await TerminalSimple then Component}
                {#if Component}
                  <Component />
                {/if}
              {/await}
            </div>
          </Pane>
        </Splitpanes>
      {:else}
        <div class="h-full bg-base-300">
          <Editor />
        </div>
      {/if}
    </Pane>
    {#if engine.current?.capabilities.preview && editorState.hasPreviewers}
      <Pane size={20}>
        <div class="h-full border-l border-base-200/60 bg-base-300">
          <Previewers />
        </div>
      </Pane>
    {/if}
    {#if engine.current?.capabilities.visualizer && showVisualizer}
      <Pane size={30}>
        <div class="h-full border-l border-base-200/60 bg-base-300 flex flex-col">
          <div class="px-3 py-2 text-xs uppercase tracking-widest text-base-content/60 border-b border-base-200/60 flex justify-between items-center">
            <span>Visualização</span>
            <button type="button" class="btn btn-ghost btn-xs" onclick={() => (showVisualizer = false)}>×</button>
          </div>
          <div class="flex-1 min-h-0 bg-white">
            <Visualizer />
          </div>
        </div>
      </Pane>
    {/if}
  </Splitpanes>
</div>

{#if showShareModal}
  <ShareModal
    workspace={currentWorkspace}
    onClose={() => (showShareModal = false)}
  />
{/if}
