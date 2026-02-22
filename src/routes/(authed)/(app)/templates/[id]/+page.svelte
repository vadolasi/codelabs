<script lang="ts">
  import { ArrowLeft, Clock, GitFork, LayoutTemplate } from "@lucide/svelte";
  import { createMutation, createQuery } from "@tanstack/svelte-query";
  import dayjs from "dayjs";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import httpClient from "$lib/httpClient";
  import Button from "../../../../../components/Button.svelte";

  const { id } = page.params;

  let isNavigating = $state(false);

  const templateQuery = createQuery({
    queryKey: ["templates", id],
    queryFn: async () => {
      const { data, error } = await httpClient.templates({ id }).get();
      if (error) throw new Error("Template não encontrado");
      return data;
    }
  });

  const forkMutation = createMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await httpClient.templates({ id }).fork.post({ name });
      if (error) throw new Error("Falha ao criar workspace do template");
      return data;
    },
    onSuccess: async (data) => {
      isNavigating = true;
      await goto(`/workspaces/${data.slug}`);
      isNavigating = false;
    }
  });

  function handleUseTemplate() {
    const name = prompt("Nome do seu novo projeto:", `${$templateQuery.data?.name}`);
    if (name) {
      $forkMutation.mutate(name);
    }
  }
</script>

<div class="max-w-2xl mx-auto py-12 px-4">
  <a href="/" class="btn btn-ghost btn-sm gap-2 mb-8 opacity-60 hover:opacity-100 transition-opacity">
    <ArrowLeft class="w-4 h-4" />
    Voltar para Workspaces
  </a>

  {#if $templateQuery.isLoading}
    <div class="space-y-6">
      <div class="skeleton h-12 w-3/4"></div>
      <div class="skeleton h-32 w-full"></div>
      <div class="skeleton h-12 w-full"></div>
    </div>
  {:else if $templateQuery.isError}
    <div class="alert alert-error">
      <span>{$templateQuery.error.message}</span>
    </div>
  {:else if $templateQuery.data}
    <div class="bg-base-100 rounded-3xl p-8 border border-base-content/10 shadow-xl space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div class="flex items-start justify-between">
        <div class="space-y-2">
          <div class="badge badge-primary badge-outline uppercase text-[10px] font-bold tracking-widest px-3">Template</div>
          <h1 class="text-4xl font-black tracking-tight">{$templateQuery.data.name}</h1>
        </div>
        <div class="p-4 bg-primary/10 text-primary rounded-2xl">
          <LayoutTemplate class="w-10 h-10" />
        </div>
      </div>

      <div class="p-6 bg-base-200/50 rounded-2xl space-y-4 border border-base-content/5">
        <div class="flex items-center gap-2 text-sm text-base-content/60">
          <Clock class="w-4 h-4" />
          <span>Criado em {dayjs($templateQuery.data.createdAt).format('DD [de] MMMM, YYYY')}</span>
        </div>
        <p class="text-base-content/80 leading-relaxed">
          Este é um template pronto para uso. Ao clicar em "Usar este Template", uma nova cópia privada 
          será criada na sua conta, permitindo que você comece a editar imediatamente com um histórico limpo.
        </p>
      </div>

      <div class="pt-4">
        <Button 
          class="btn-primary btn-lg w-full gap-3 shadow-lg shadow-primary/20"
          onclick={handleUseTemplate}
          loading={$forkMutation.isPending || isNavigating}
        >
          <GitFork class="w-5 h-5" />
          Usar este Template
        </Button>
      </div>
    </div>
  {/if}
</div>
