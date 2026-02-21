<script lang="ts">
  import { createMutation } from "@tanstack/svelte-query"
  import { unified } from "unified"
  import remarkParse from "remark-parse"
  import remarkRehype from "remark-rehype"
  import rehypeStringify from "rehype-stringify"
  import { Send, Eye, PenLine } from "@lucide/svelte"
  import httpClient from "$lib/httpClient"
  import Button from "../../../../../components/Button.svelte"
  import toaster from "../../../../../components/Toaster/store"

  let subject = $state("")
  let markdownContent = $state("")
  let previewHtml = $state("")
  let activeTab = $state<"write" | "preview">("write")

  async function renderMarkdown(content: string) {
    const file = await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(content)
    return String(file)
  }

  $effect(() => {
    if (activeTab === "preview") {
      renderMarkdown(markdownContent).then(html => {
        previewHtml = html
      })
    }
  })

  const sendEmailMutation = createMutation({
    mutationFn: async () => {
      const { error } = await httpClient.admin.broadcast.post({
        subject,
        markdown: markdownContent
      })
      if (error) throw new Error(error.value.message ?? "Erro ao enviar e-mails")
    },
    onSuccess: () => {
      toaster.create({
        title: "Sucesso",
        description: "E-mails enviados para a fila de processamento",
        type: "success"
      })
      subject = ""
      markdownContent = ""
      activeTab = "write"
    },
    onError: (err) => {
      toaster.create({
        title: "Erro",
        description: err.message,
        type: "error"
      })
    }
  })
</script>

<div class="container mx-auto p-6 max-w-4xl space-y-8">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Transmissão de E-mail</h1>
      <p class="text-base-content/60 text-sm">Envie um comunicado para todos os usuários da plataforma.</p>
    </div>
  </div>

  <div class="card bg-base-100 shadow-xl border border-base-content/10">
    <div class="card-body gap-6">
      <!-- Assunto -->
      <div class="form-control">
        <label class="label font-bold text-sm uppercase tracking-wide opacity-70" for="subject">
          Assunto
        </label>
        <input 
          id="subject"
          type="text" 
          bind:value={subject}
          placeholder="Ex: Novidades na plataforma..." 
          class="input input-bordered w-full text-lg font-medium placeholder:font-normal"
        />
      </div>

      <!-- Editor / Preview Toggle -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label class="label font-bold text-sm uppercase tracking-wide opacity-70" for="content">
            Conteúdo
          </label>
          <div class="join">
            <button 
              class="join-item btn btn-sm gap-2"
              class:btn-active={activeTab === "write"}
              onclick={() => activeTab = "write"}
            >
              <PenLine class="w-4 h-4" /> Escrever
            </button>
            <button 
              class="join-item btn btn-sm gap-2"
              class:btn-active={activeTab === "preview"}
              onclick={() => activeTab = "preview"}
            >
              <Eye class="w-4 h-4" /> Visualizar
            </button>
          </div>
        </div>

        {#if activeTab === "write"}
          <textarea
            id="content"
            bind:value={markdownContent}
            class="textarea textarea-bordered min-h-[400px] font-mono text-sm leading-relaxed"
            placeholder="Escreva sua mensagem em Markdown..."
          ></textarea>
          <div class="text-xs text-base-content/50 px-1">
            Suporta Markdown básico: **negrito**, *itálico*, [links](url), listas, etc.
          </div>
        {:else}
          <div class="min-h-[400px] p-6 bg-base-200/50 rounded-lg border border-base-content/10 prose prose-sm max-w-none">
            {@html previewHtml}
          </div>
        {/if}
      </div>

      <!-- Actions -->
      <div class="card-actions justify-end pt-4 border-t border-base-content/10">
        <Button 
          class="btn-primary gap-2" 
          onclick={() => $sendEmailMutation.mutate()}
          loading={$sendEmailMutation.isPending}
          disabled={!subject.trim() || !markdownContent.trim()}
        >
          <Send class="w-4 h-4" />
          Enviar Transmissão
        </Button>
      </div>
    </div>
  </div>
</div>
