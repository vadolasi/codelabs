<script lang="ts">
import { Home } from "@lucide/svelte"
import type { WebContainer } from "@webcontainer/api"
import { io, type Socket } from "socket.io-client"
import { onMount } from "svelte"
import { Pane, Splitpanes } from "svelte-splitpanes"
import httpClient from "$lib/httpClient"
import parser from "$lib/socketio-msgpack-parser"
import Editor from "./Editor.svelte"
import editorState, {
  ephemeralStore,
  loroDoc,
  webcontainer
} from "./editorState.svelte"
import FileTree from "./FileTree/index.svelte"
import Previewers from "./Previewers/index.svelte"
import type {
  ClientToServerEvents,
  ServerToClientEvents
} from "./socket-io-types"
import Terminal from "./Terminal.svelte"

const {
  webcontainer: loadedWebContainer,
  workspace
}: {
  webcontainer: WebContainer
  workspace: Exclude<
    Awaited<
      ReturnType<ReturnType<typeof httpClient.workspaces>["get"]>
    >["data"],
    null | undefined
  >["workspace"]
} = $props()

$effect(() => {
  webcontainer.current = loadedWebContainer
})

const currentWorkspace = $derived.by(() => workspace)

onMount(() => {
  webcontainer.current.on("server-ready", async (port, url) => {
    editorState.addPreviewer(port, url)
  })
  webcontainer.current.on("port", (port, event) => {
    if (event === "close") {
      editorState.removePreviewer(port)
    }
  })
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
    window.location.origin,
    {
      parser,
      query: {
        workspaceId: currentWorkspace.id
      }
    }
  )
  socket.on("loro-update", (update) => {
    loroDoc.import(update)
  })
  socket.on("ephemeral-update", (update) => {
    ephemeralStore.apply(update)
  })
  loroDoc.subscribeLocalUpdates((update) => {
    socket.emit("loro-update", currentWorkspace.id, update)
  })
  ephemeralStore.subscribeLocalUpdates((update) => {
    socket.emit("ephemeral-update", currentWorkspace.id, update)
  })

  return () => {
    socket.disconnect()
  }
})

const terminals: string[] = $state([])
let currentTerminal: string | null = $state(null)

function newTerminal() {
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
</script>

<div class="h-screen w-screen flex flex-col bg-base-300 text-base-content">
  <div class="w-full border-b border-base-200/60 bg-base-200/80 backdrop-blur-md">
    <div class="px-3 py-2 flex items-center gap-3">
      <a href="/" class="btn btn-ghost btn-sm">
        <Home class="h-4 w-4" />
      </a>
      <div class="flex items-center gap-2">
        <div class="badge badge-primary badge-outline">Workspace</div>
        <div class="text-sm font-medium text-base-content/90">{currentWorkspace.name}</div>
      </div>
      <div class="ml-auto flex items-center gap-2">
        <button class="btn btn-ghost btn-xs" onclick={newTerminal}>Novo terminal</button>
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
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
            <button class="btn btn-ghost btn-xs" onclick={newTerminal}>
              {#if terminals.length > 0}
                +
              {:else}
                Novo terminal
              {/if}
            </button>
          </div>
          {#each terminals as terminal (terminal)}
            <div class="flex-1 overflow-hidden" class:hidden={currentTerminal !== terminal}>
              <Terminal />
            </div>
          {/each}
        </Pane>
      </Splitpanes>
    </Pane>
    {#if editorState.hasPreviewers }
      <Pane size={20}>
        <div class="h-full border-l border-base-200/60 bg-base-300">
          <Previewers />
        </div>
      </Pane>
    {/if}
  </Splitpanes>
</div>
