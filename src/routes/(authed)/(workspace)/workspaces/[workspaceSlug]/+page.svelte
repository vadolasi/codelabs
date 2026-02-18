<script lang="ts">
import { createQuery } from "@tanstack/svelte-query"
import { onMount, untrack } from "svelte"
import { page } from "$app/state"
import httpClient from "$lib/httpClient"
import editorState from "../../../../../components/Editor/editorState.svelte"
import Editor from "../../../../../components/Editor/index.svelte"

const { data } = $props()

$effect(() => {
  if (data.user && 'username' in data.user) {
    editorState.username = data.user.username
  }
})

const {
  params: { workspaceSlug }
} = page

$effect(() => {
  return () => {
    editorState.reset()
  }
})


const query = createQuery({
  queryKey: ["workspaces", workspaceSlug],
  queryFn: async () => {
    const { data, error } = await httpClient
      .workspaces({ slug: workspaceSlug! })
      .get({ headers: { accept: "application/x-msgpack" } })
    if (error) {
      throw new Error("Error fetching workspace")
    }
    return data
  }
})

let engine: any | null = $state(null)
let loadError: string | null = $state(null)

onMount(() => {
  return () => {
    engine?.close()
  }
})

$effect(() => {
  if ($query.data !== undefined && engine === null && !loadError) {
    (async () => {
      console.log("[Workspace] Iniciando setup...");
      try {
        untrack(() => {
          editorState.reset()
          if ($query.data.doc) editorState.loroDoc.import(new Uint8Array($query.data.doc))
          if ($query.data.updates) {
            const updates = $query.data.updates
              .filter((update): update is any => Boolean(update))
              .map(u => new Uint8Array(u))
            editorState.loroDoc.importBatch(updates)
          }
          editorState.loroDoc.commit();
        })

        const engineType = ($query.data.workspace.engine || 'webcontainers') as 'webcontainers' | 'skulpt'
        console.log("[Workspace] Engine selecionada:", engineType);

        let instance;
        if (engineType === 'webcontainers') {
          const { default: WebcontainerEngine } = await import("$lib/engine/webcontainer/index.svelte")
          instance = new WebcontainerEngine()
        } else {
          const { default: SkulptEngine } = await import("$lib/engine/skulpt/index.svelte")
          instance = new SkulptEngine()
        }

        console.log("[Workspace] Preparando engine...");
        await instance.prepare()
        console.log("[Workspace] Inicializando engine...");
        await instance.initialize()
        
        console.log("[Workspace] Engine pronta!");
        engine = instance
      } catch (err: any) {
        console.error("[Workspace] Erro na inicialização:", err);
        loadError = err.message || "Erro desconhecido";
      }
    })()
  }
})
</script>

{#if loadError}
  <div class="flex flex-col items-center justify-center h-screen gap-4">
    <span class="text-error text-xl font-bold">Erro ao carregar</span>
    <p class="text-base-content/70">{loadError}</p>
    <button class="btn btn-primary" onclick={() => window.location.reload()}>Recarregar</button>
  </div>
{:else if $query.isLoading || engine === null || engine.readyState !== 'ready'}
  <div class="flex flex-col items-center justify-center h-screen gap-4">
    <div class="radial-progress animate-spin" style:--value={70} aria-valuenow="70" role="progressbar"></div>
    <span class="text-2xl text-base-content text-center">Carregando ambiente de<br />desenvolvimento</span>
  </div>
{:else if $query.isError}
  <p>Error: {$query.error.message}</p>
{:else if $query.isSuccess && engine !== null}
  <Editor {engine} workspace={$query.data.workspace} />
{/if}
