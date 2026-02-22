<script lang="ts">
import randomName from "@scaleway/random-name"
import { createForm } from "@tanstack/svelte-form"
import { createMutation } from "@tanstack/svelte-query"
import { z } from "zod"
import { goto } from "$app/navigation"
import { cn } from "$lib/cn"
import httpClient from "$lib/httpClient"
import Button from "../../../../../components/Button.svelte"
import FormField from "../../../../../components/FormField.svelte"

const schema = z.object({
  name: z.string().min(1, "Este campo é obrigatório"),
  runtime: z.enum(["webcontainers", "skulpt", "pyodide"])
})

type FormData = z.infer<typeof schema>

let isNavigating = $state(false)

const runtimes = [
  {
    id: "webcontainers",
    name: "WebContainer",
    language: "Node.js",
    description: "Ambiente completo com Node.js",
    features: ["Mini sistema operacional completo", "Suporte a npm install"]
  },
  {
    id: "skulpt",
    name: "Skulpt",
    language: "Python",
    description: "Implementação de Python em JavaScript",
    features: ["Suporte ao módulo Turtle", "Suporte limitado a sintaxe do Python 3"]
  },
  {
    id: "pyodide",
    name: "Pyodide",
    language: "Python",
    description: "Python completo portado para o navegador",
    features: ["Python 3 completo", "Suporte a depêndencias externas (pip)"]
  }
] as const

const createWorkspaceMutation = createMutation({
  mutationFn: async ({ name, runtime }: FormData) => {
    const { data, error } = await httpClient.workspaces.post({ name, engine: runtime })

    if (error) {
      throw new Error(error.value.message ?? "UNKNOWN_ERROR")
    }

    return data
  },
  onSuccess: async ({ slug }) => {
    isNavigating = true
    await goto(`/workspaces/${slug}`)
    isNavigating = false
  },
  onError: (error) => {
    console.error("Login error:", error)
  }
})

const form = createForm(() => ({
  defaultValues: {
    name: randomName("", " "),
    runtime: "webcontainers" as const
  },
  onSubmit: async ({ value }) => {
    $createWorkspaceMutation.mutate(value)
  }
}))

let wizardStep = $state<"none" | "lang" | "turtle" | "recommend">("none")
let wizardData = $state({
  lang: "" as "nodejs" | "python" | "",
  turtle: null as boolean | null,
  recommendation: "" as typeof runtimes[number]["id"] | ""
})

function openWizard() {
  wizardStep = "lang"
  wizardData = { lang: "", turtle: null, recommendation: "" }
}

function handleWizardLang(lang: "nodejs" | "python") {
  wizardData.lang = lang
  if (lang === "nodejs") {
    wizardData.recommendation = "webcontainers"
    wizardStep = "recommend"
  } else {
    wizardStep = "turtle"
  }
}

function handleWizardTurtle(useTurtle: boolean) {
  wizardData.turtle = useTurtle
  wizardData.recommendation = useTurtle ? "skulpt" : "pyodide"
  wizardStep = "recommend"
}

function applyRecommendation() {
  if (wizardData.recommendation) {
    form.setFieldValue("runtime", wizardData.recommendation as any)
  }
  wizardStep = "none"
}
</script>

<form
  novalidate
  onsubmit={(e) => {
    e.preventDefault()
    e.stopPropagation()
    form.handleSubmit()
  }}
  class="flex flex-col gap-6 max-w-4xl mx-auto"
>
  <h1 class="title">Criar Workspace</h1>
  
  <form.Field name="name" validators={{ onBlur: schema.shape.name }}>
    {#snippet children(field)}
      <FormField field={field} label="Nome do Workspace" type="text" />
    {/snippet}
  </form.Field>

  <form.Field name="runtime">
    {#snippet children(field)}
      <div class="flex flex-col gap-3">
        <div class="flex justify-between items-end">
          <label class="label p-0" for={field.name}>
            <span class="label-text font-bold text-lg">Runtime</span>
          </label>
          <button 
            type="button" 
            onclick={openWizard}
            class="btn btn-ghost btn-sm text-primary underline normal-case h-auto min-h-0"
          >
            Não sei qual escolher
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          {#each runtimes as runtime}
            <button
              type="button"
              onclick={() => field.handleChange(runtime.id)}
              class={cn(
                "flex flex-col text-left p-4 rounded-xl border-2 transition-all hover:border-primary/50 group",
                field.state.value === runtime.id 
                  ? "border-primary bg-primary/5 shadow-md" 
                  : "border-base-content/10 bg-base-200"
              )}
            >
              <div class="flex justify-between items-start mb-2">
                <span class="badge badge-sm badge-soft badge-primary opacity-70">{runtime.language}</span>
                <div class={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                  field.state.value === runtime.id ? "border-primary bg-primary" : "border-base-content/30"
                )}>
                  {#if field.state.value === runtime.id}
                    <div class="w-2 h-2 rounded-full bg-primary-content"></div>
                  {/if}
                </div>
              </div>
              
              <h3 class="font-bold text-lg leading-none mb-1">{runtime.name}</h3>
              <p class="text-xs opacity-70 mb-4 line-clamp-2 min-h-10">{runtime.description}</p>
              
              <ul class="flex flex-col gap-1 mt-auto">
                {#each runtime.features as feature}
                  <li class="flex items-center gap-2 text-[10px] uppercase font-bold opacity-60">
                    <div class="w-1 h-1 rounded-full bg-current"></div>
                    {feature}
                  </li>
                {/each}
              </ul>
            </button>
          {/each}
        </div>

        {#if field.state.meta.errors.length > 0}
          <label class="label" for={field.name}>
            <span class="label-text-alt text-error">{field.state.meta.errors.join(", ")}</span>
          </label>
        {/if}
      </div>
    {/snippet}
  </form.Field>

  <Button type="submit" class="btn-primary mt-4" loading={$createWorkspaceMutation.isPending || isNavigating}>Criar Workspace</Button>
</form>

{#if wizardStep !== "none"}
  <div class="modal modal-open">
    <div class="modal-box">
      <button
        type="button"
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" 
        onclick={() => wizardStep = "none"}
      >✕</button>
      
      <h3 class="font-bold text-lg mb-4">Ajudante de Escolha</h3>

      {#if wizardStep === "lang"}
        <p class="mb-6">Qual linguagem você pretende utilizar no seu workspace?</p>
        <div class="grid grid-cols-2 gap-4">
          <button 
            type="button"
            class="btn btn-outline h-auto py-6 flex flex-col gap-2 hover:bg-primary hover:border-primary"
            onclick={() => handleWizardLang("nodejs")}
          >
            <span class="text-xl">Node.js</span>
            <span class="text-xs font-normal opacity-70">Javascript</span>
          </button>
          <button
            type="button"
            class="btn btn-outline h-auto py-6 flex flex-col gap-2 hover:bg-primary hover:border-primary"
            onclick={() => handleWizardLang("python")}
          >
            <span class="text-xl">Python</span>
          </button>
        </div>
      {:else if wizardStep === "turtle"}
        <p class="mb-2">Você pretende utilizar o módulo <strong>Turtle</strong>?</p>
        <p class="text-sm opacity-70 mb-6">O Turtle é muito utilizado para ensino de programação com desenhos e animações.</p>
        <div class="grid grid-cols-2 gap-4">
          <button
            type="button"
            class="btn btn-outline hover:bg-primary hover:border-primary"
            onclick={() => handleWizardTurtle(true)}
          >Sim, vou usar</button>
          <button 
            type="button"
            class="btn btn-outline hover:bg-primary hover:border-primary"
            onclick={() => handleWizardTurtle(false)}
          >Não preciso</button>
        </div>
      {:else if wizardStep === "recommend"}
        <div class="text-center py-4">
          <p class="mb-2">Baseado nas suas respostas, recomendamos:</p>
          <div class="bg-base-200 p-6 rounded-xl border-2 border-primary mb-6">
            <h4 class="text-2xl font-black text-primary uppercase italic">
              {runtimes.find(r => r.id === wizardData.recommendation)?.name}
            </h4>
            <p class="text-sm opacity-70 mt-2">
              {runtimes.find(r => r.id === wizardData.recommendation)?.description}
            </p>
          </div>
          <button 
            type="button"
            class="btn btn-primary w-full"
            onclick={applyRecommendation}
          >Selecionar opção recomendada</button>
        </div>
      {/if}
    </div>
    <button type="button" class="modal-backdrop" onclick={() => wizardStep = "none"} aria-label="Fechar"></button>
  </div>
{/if}
