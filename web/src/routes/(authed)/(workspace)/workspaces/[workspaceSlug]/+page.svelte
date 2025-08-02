<script lang="ts">
import { page } from "$app/state"
import httpClient from "$lib/httpClient"
import { createQuery } from "@tanstack/svelte-query"
import { type FileSystemTree, WebContainer } from "@webcontainer/api"
import type { LoroList } from "loro-crdt"
import { onMount } from "svelte"
import {
	filesMap,
	loroDoc
} from "../../../../../components/Editor/editorState.svelte"
import Editor from "../../../../../components/Editor/index.svelte"

function getFileTree(rootPath = "/"): FileSystemTree {
	const fileTree: FileSystemTree = {}

	const rootChildren =
		(filesMap.get(rootPath)?.get("children") as LoroList<string>)?.toArray() ||
		[]

	for (const childId of rootChildren) {
		const filename = childId.split("/").pop()!
		const childData = filesMap.get(childId)
		const itemData = childData.get("data") as Item

		if (itemData.type === "file") {
			fileTree[filename] = {
				file: {
					contents: itemData.content
				}
			}
		} else if (itemData.type === "directory") {
			fileTree[filename] = {
				directory: getFileTree(itemData.path)
			}
		}
	}

	return fileTree
}

const {
	params: { workspaceSlug }
} = page

const query = createQuery({
	queryKey: ["workspaces", workspaceSlug],
	queryFn: async () => {
		const { data, error } = await httpClient
			.workspaces({ slug: workspaceSlug })
			.get()

		if (error) {
			throw new Error("Error fetching workspace")
		}

		return data
	}
})

let webcontainer: WebContainer | null = null

$: if ($query.data !== undefined && webcontainer === null) {
	loroDoc.import($query.data.doc)

	WebContainer.boot({
		workdirName: "codelabs"
	}).then(async (loadedWebcontainer) => {
		loadedWebcontainer.mount(getFileTree()).then(() => {
			webcontainer = loadedWebcontainer
		})
	})
}

onMount(() => {
	return () => {
		if (webcontainer) {
			webcontainer.teardown()
		}
	}
})
</script>

{#if $query.isLoading || webcontainer === null}
  <div class="flex flex-col items-center justify-center h-screen gap-4">
    <div class="radial-progress animate-spin" style:--value={70} aria-valuenow="70" role="progressbar"></div>
    <span class="text-2xl text-base-content text-center">Carregando ambiente de<br />desenvolvimento</span>
  </div>
{:else if $query.isError}
  <p>Error: {$query.error.message}</p>
{:else if $query.isSuccess && webcontainer !== null}
  <Editor webcontainer={webcontainer} workspace={$query.data.workspace} />
{/if}
