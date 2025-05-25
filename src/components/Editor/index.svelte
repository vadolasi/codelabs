<script lang="ts">
import type { WebContainer } from "@webcontainer/api"
import { onMount } from "svelte"
import { Pane, Splitpanes } from "svelte-splitpanes"
import Editor from "./Editor.svelte"
import FileTree from "./FileTree/index.svelte"
import Terminal from "./Terminal.svelte"
import editorState, { webcontainer } from "./editorState.svelte"
import httpClient from "$lib/httpClient"
import Button from "../Button.svelte"
import { createMutation } from "@tanstack/svelte-query"
import { formatRelativeTime } from "$lib/date"

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
	>
} = $props()
webcontainer.current = loadedWebContainer

let currentWorkspace: Exclude<
	Awaited<ReturnType<ReturnType<typeof httpClient.workspaces>["get"]>>["data"],
	null | undefined
> = $state(workspace)

let iframeUrl: string | null = $state(null)

onMount(() => {
	webcontainer.current.on("server-ready", async (_port, url) => {
		iframeUrl = url
	})
	setInterval(() => {
		renderCurrentDate++
	}, 1000)
})

const saveWorkspaceMutation = createMutation({
	mutationFn: async () => {
		const { data, error } = await httpClient
			.workspaces({ id: workspace.id })
			.patch({
				content: await webcontainer.current.export(".", { format: "json" })
			})

		if (error) {
			throw new Error(error.value.message ?? "UNKNOWN_ERROR")
		}

		return data
	},
	onSuccess: (newWorkspace) => {
		currentWorkspace = newWorkspace
		editorState.isUpToDate = true
	},
	onError: (error) => {
		console.error("Login error:", error)
	}
})

let renderCurrentDate = $state(0)

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

<div class="h-screen w-screen flex flex-col">
  <div class="w-full bg-base-200 p-2 flex justify-between items-center shrink-0">
    <div></div>
    <div class="flex gap-2 items-center">
      {#if editorState.isUpToDate}
        {#key renderCurrentDate}
          <span class="text-sm text-base-content/50">Última atualização: {formatRelativeTime(currentWorkspace.updatedAt)}</span>
        {/key}
      {:else}
        <span class="text-sm text-primary">Existem alterações não salvas</span>
      {/if}
      <Button class="btn-primary btn-sm" loading={$saveWorkspaceMutation.isPending} disabled={editorState.isUpToDate} onclick={() => $saveWorkspaceMutation.mutate()}>Salvar</Button>
    </div>
  </div>
  <Splitpanes theme="modern-theme" class="w-full h-full flex-1 overflow-hidden">
    <Pane maxSize={70} size={20}>
      <FileTree />
    </Pane>
    <Pane>
      <Splitpanes theme="modern-theme" horizontal={true}>
        <Pane>
          <Editor />
        </Pane>
        <Pane class="flex flex-col">
          <div class="shrink-0 flex">
            {#if terminals.length > 0}
              <div class="flex">
                {#each terminals as terminal, index (terminal)}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <div role="button" tabindex="0" class="py-1 px-3 flex gap-1 items-center justify-center hover:bg-base-200 text-sm group border-primery select-none" class:bg-base-200={terminal === currentTerminal} onclick={() => setCurrentTerminal(terminal)}>
                    <span>Terminal {index}</span>
                    <button
                      type="button"
                      aria-label="Close tab"
                      class="invisible group-hover:visible p-1 rounded-sm hover:bg-base-200 group-hover:hover:bg-base-300"
                      class:visible={currentTerminal === terminal}
                      onclick={() => closeTerminal(terminal)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
            <button class="py-1 px-3 flex gap-1 items-center justify-center hover:bg-base-300 text-sm border-primery select-none" onclick={newTerminal}>
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
    {#if iframeUrl !== null}
      <Pane size={20}>
        <iframe
          title={`WebContainer - ${iframeUrl}`}
          src={iframeUrl}
          class="w-full h-full"
          sandbox="allow-same-origin allow-scripts allow-modals allow-forms"
        ></iframe>
      </Pane>
    {/if}
  </Splitpanes>
</div>
