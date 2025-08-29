<script lang="ts">
import { PUBLIC_BACKEND_DOMAIN } from "$env/static/public"
import httpClient from "$lib/httpClient"
import { Home } from "@lucide/svelte"
import type { WebContainer } from "@webcontainer/api"
import { Packr } from "msgpackr"
import { WebSocket } from "partysocket"
import { onMount } from "svelte"
import { Pane, Splitpanes } from "svelte-splitpanes"
import Editor from "./Editor.svelte"
import FileTree from "./FileTree/index.svelte"
import Previewers from "./Previewers/index.svelte"
import Terminal from "./Terminal.svelte"
import editorState, {
	ephemeralStore,
	loroDoc,
	webcontainer
} from "./editorState.svelte"

const packr = new Packr({
	bundleStrings: true
})

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

webcontainer.current = loadedWebContainer

let currentWorkspace = $state(workspace)

onMount(() => {
	webcontainer.current.on("server-ready", async (port, url) => {
		editorState.addPreviewer(port, url)
	})
	webcontainer.current.on("port", (port, event) => {
		if (event === "close") {
			editorState.removePreviewer(port)
		}
	})
	const preWs = httpClient
		.workspaces({ slug: currentWorkspace.id })
		.subscribe().ws
	const websocketClient = new WebSocket(preWs.url)
	preWs.close()
	websocketClient.onmessage = (event) => {
		const update = packr.unpack(new Uint8Array(event.data)) as {
			type: string
			update: ArrayBuffer
		}
		if (update.type === "loro-update") {
			loroDoc.import(new Uint8Array(update.update))
		} else if (update.type === "ephemeral-update") {
			ephemeralStore.apply(new Uint8Array(update.update))
		}
	}
	loroDoc.subscribeLocalUpdates((update) => {
		websocketClient.send(
			packr.pack({ type: "loro-update", update: update.buffer })
		)
	})
	ephemeralStore.subscribeLocalUpdates((update) => {
		websocketClient.send(
			packr.pack({ type: "ephemeral-update", update: update.buffer })
		)
	})

	return () => websocketClient.close()
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

<div class="h-screen w-screen flex flex-col">
  <div class="w-full bg-base-200 p-2 flex justify-between items-center shrink-0">
    <div>
      <a href="/"><Home /></a>
    </div>
    <div class="text-sm text-secondary-content">{currentWorkspace.name}</div>
    <div></div>
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
                    <span>Terminal {index + 1}</span>
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
    {#if editorState.hasPreviewers }
      <Pane size={20}>
        <Previewers />
      </Pane>
    {/if}
  </Splitpanes>
</div>
