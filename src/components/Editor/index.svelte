<script lang="ts">
import type { WebContainer } from "@webcontainer/api"
import { onMount } from "svelte"
import { Pane, Splitpanes } from "svelte-splitpanes"
import Editor from "./Editor.svelte"
import FileTree from "./FileTree.svelte"
import Terminal from "./Terminal.svelte"
import editorState, { webcontainer } from "./editorState.svelte"
import httpClient from "$lib/httpClient"
import Button from "../Button.svelte";
  import { createMutation } from "@tanstack/svelte-query";
  import { formatRelativeTime } from "$lib/date";

const { webcontainer: loadedWebContainer, workspace }: { webcontainer: WebContainer, workspace: Exclude<Awaited<ReturnType<ReturnType<typeof httpClient.workspaces>["get"]>>["data"], null | undefined> } =
	$props()
webcontainer.current = loadedWebContainer

let currentWorkspace: Exclude<Awaited<ReturnType<ReturnType<typeof httpClient.workspaces>["get"]>>["data"], null | undefined> = $state(workspace)

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
		const { data, error } = await httpClient.workspaces({ id: workspace.id }).patch({
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
</script>

<div class="h-screen w-screen flex flex-col">
  <div class="w-full bg-base-200 p-2 flex justify-between items-center">
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
  <Splitpanes theme="modern-theme" class="w-full h-full flex-1">
    <Pane maxSize={70} size={20}>
      <FileTree />
    </Pane>
    <Pane>
      <Splitpanes theme="modern-theme" horizontal={true}>
        <Pane>
          <Editor />
        </Pane>
        <Pane>
          <Terminal />
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
