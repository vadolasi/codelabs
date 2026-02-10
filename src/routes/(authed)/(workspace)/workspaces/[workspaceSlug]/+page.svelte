<script lang="ts">
import { page } from "$app/state"
import { startFsWatcher } from "$lib/fswatcher/start"
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

function decodeBase64ToUint8(value: string) {
	const binary = atob(value)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i)
	}
	return bytes
}

function normalizeBinary(value: unknown): Uint8Array | null {
	if (value instanceof Uint8Array) return value
	if (value instanceof ArrayBuffer) return new Uint8Array(value)
	if (Array.isArray(value)) return new Uint8Array(value as number[])
	if (typeof value === "string") return decodeBase64ToUint8(value)
	return null
}

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
			.workspaces({ slug: workspaceSlug! })
			.get()

		if (error) {
			throw new Error("Error fetching workspace")
		}

		return data
	}
})

let webcontainer: WebContainer | null = null
let stopFsWatcher: (() => void) | null = null

$: if ($query.data !== undefined && webcontainer === null) {
	if ($query.data.doc) {
		const snapshot = normalizeBinary($query.data.doc)
		if (snapshot) {
			loroDoc.import(snapshot)
		}
	}

	if ($query.data.updates?.length) {
		const updates = $query.data.updates
			.map((update) => normalizeBinary(update))
			.filter((update): update is Uint8Array => Boolean(update))
		if (updates.length > 0) {
			loroDoc.importBatch(updates)
		}
	}

	WebContainer.boot({
		workdirName: "codelabs"
	}).then(async (loadedWebcontainer) => {
		await loadedWebcontainer.mount(getFileTree())
		stopFsWatcher = await startFsWatcher(loadedWebcontainer, {
			rootPath: "."
		})
		webcontainer = loadedWebcontainer
	})
}

onMount(() => {
	return () => {
		if (webcontainer) {
			stopFsWatcher?.()
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
