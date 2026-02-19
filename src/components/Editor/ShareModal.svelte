<script lang="ts">
import { 
  Check, 
  Copy, 
  Eye,
  Globe,
  LayoutTemplate,
  Link as LinkIcon, 
  Lock,
  Mail, 
  RefreshCw,
  ShieldCheck,
  Trash2, 
  UserCheck,
  UserPlus,
  Users, 
  X 
} from "@lucide/svelte"
import { createMutation, createQuery, useQueryClient } from "@tanstack/svelte-query"
import httpClient from "$lib/httpClient"
import toaster from "../Toaster/store"

interface Props {
  workspace: {
    id: string
    name: string
    role: "owner" | "admin" | "editor" | "viewer"
    visibility: "private" | "public"
  }
  onClose: () => void
}

const { workspace, onClose }: Props = $props()
const queryClient = useQueryClient()

const membersQuery = createQuery({
  queryKey: ["workspaces", workspace.id, "members"],
  queryFn: async () => {
    const { data, error } = await httpClient.workspaces.id({ id: workspace.id }).members.get()
    if (error) throw new Error("Erro ao carregar membros")
    return data
  }
})

const editorInviteQuery = createQuery({
  queryKey: ["workspaces", workspace.id, "invite", "editor"],
  queryFn: async () => {
    const { data, error } = await httpClient.workspaces.invite.post({
      workspaceId: workspace.id,
      role: "editor",
      users: null,
      ttl: null
    })
    if (error) throw new Error("Erro ao carregar link de editor")
    return data
  }
})

const viewerInviteQuery = createQuery({
  queryKey: ["workspaces", workspace.id, "invite", "viewer"],
  queryFn: async () => {
    const { data, error } = await httpClient.workspaces.invite.post({
      workspaceId: workspace.id,
      role: "viewer",
      users: null,
      ttl: null
    })
    if (error) throw new Error("Erro ao carregar link de visualizador")
    return data
  }
})

const resetLinkMutation = createMutation({
  mutationFn: async (role: "editor" | "viewer") => {
    const { data, error } = await httpClient.workspaces.invite.post({
      workspaceId: workspace.id,
      role,
      users: null,
      ttl: null,
      forceNew: true
    })
    if (error) throw new Error("Erro ao resetar link")
    return { data, role }
  },
  onSuccess: ({ role }) => {
    queryClient.invalidateQueries({ queryKey: ["workspaces", workspace.id, "invite", role] })
    toaster.create({ title: "Sucesso", description: "Link resetado com sucesso", type: "success" })
  }
})

const removeMemberMutation = createMutation({
  mutationFn: async (userId: string) => {
    const { error } = await httpClient.workspaces.id({ id: workspace.id }).members({ targetUserId: userId }).delete()
    if (error) throw new Error("Erro ao remover membro")
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["workspaces", workspace.id, "members"] })
    toaster.create({ title: "Membro removido", type: "success" })
  }
})

let inviteInput = $state("")
let inviteRole = $state<"editor" | "viewer">("editor")

const addMemberMutation = createMutation({
  mutationFn: async () => {
    if (!inviteInput.trim()) return
    const { error } = await httpClient.workspaces.id({ id: workspace.id }).members.post({
      email: inviteInput.trim(),
      role: inviteRole
    })
    if (error) {
      if (error.status === 400) throw new Error("E-mail já é membro ou inválido")
      throw new Error("Erro ao enviar convite")
    }
  },
  onSuccess: () => {
    inviteInput = ""
    queryClient.invalidateQueries({ queryKey: ["workspaces", workspace.id, "members"] })
    toaster.create({ title: "Sucesso", description: "Membro adicionado!", type: "success" })
  },
  onError: (err: any) => {
    toaster.create({ title: "Erro", description: err.message, type: "error" })
  }
})

const createTemplateMutation = createMutation({
  mutationFn: async () => {
    const { data, error } = await httpClient.workspaces.id({ id: workspace.id }).template.post()
    if (error) throw new Error("Erro ao criar template")
    return data
  },
  onSuccess: (data) => {
    const url = `${window.location.origin}/templates/${data.id}`
    navigator.clipboard.writeText(url)
    toaster.create({ 
      title: "Template Criado!", 
      description: "O link do template foi copiado para sua área de transferência", 
      type: "success" 
    })
  }
})

let copiedRole = $state<string | null>(null)

function copyLink(token: string, role: string) {
  const url = `${window.location.origin}/invite/${token}`
  navigator.clipboard.writeText(url)
  copiedRole = role
  setTimeout(() => (copiedRole = null), 2000)
}

const isOwner = $derived(workspace.role === "owner")

const updateVisibilityMutation = createMutation({
  mutationFn: async (visibility: "private" | "public") => {
    const { error } = await httpClient.workspaces.id({ id: workspace.id }).patch({ visibility })
    if (error) throw new Error("Erro ao atualizar visibilidade")
  },
  onSuccess: () => {
    // Invalidate all workspace-related queries to ensure the UI updates everywhere
    queryClient.invalidateQueries({ queryKey: ["workspaces"] })
    toaster.create({ title: "Visibilidade atualizada", type: "success" })
  }
})
</script>

<div
  role="button"
  tabindex={0}
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all"
  onclick={(e) => e.target === e.currentTarget && onClose()}
  onkeydown={(e) => e.key === "Escape" && onClose()}
>
  <div class="bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-base-content/10">
    <div class="px-6 py-5 border-b border-base-200 flex items-center justify-between bg-base-200/30">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-primary/10 rounded-lg text-primary">
          <Users class="w-5 h-5" />
        </div>
        <div>
          <h3 class="font-bold text-lg leading-tight">Compartilhar</h3>
          <p class="text-xs text-base-content/60">{workspace.name}</p>
        </div>
      </div>
      <button type="button" class="btn btn-ghost btn-sm btn-circle" onclick={onClose}>
        <X class="w-5 h-5" />
      </button>
    </div>

    <div class="p-6 space-y-8 overflow-y-auto max-h-[70vh]">
      <!-- Visibility Section (Owners Only) - MOVED TO TOP -->
      {#if isOwner}
        <section class="space-y-3">
          <h4 class="text-xs font-bold uppercase tracking-wider text-base-content/50 px-1">Privacidade do Workspace</h4>
          <div class="flex gap-2 p-1 bg-base-200/50 rounded-2xl border border-base-content/5">
            <button 
              class="flex-1 btn btn-sm gap-2 border-none transition-all duration-200 {workspace.visibility === 'private' ? 'btn-primary' : 'bg-transparent hover:bg-base-content/5'}" 
              onclick={() => $updateVisibilityMutation.mutate('private')}
            >
              <Lock class="w-3.5 h-3.5" />
              Privado
            </button>
            <button 
              class="flex-1 btn btn-sm gap-2 border-none transition-all duration-200 {workspace.visibility === 'public' ? 'btn-primary' : 'bg-transparent hover:bg-base-content/5'}" 
              onclick={() => $updateVisibilityMutation.mutate('public')}
            >
              <Globe class="w-3.5 h-3.5" />
              Público
            </button>
          </div>
          <p class="text-[10px] text-base-content/40 text-center">
            {workspace.visibility === 'public' ? 'Qualquer pessoa com o link pode visualizar este projeto.' : 'Apenas membros convidados podem acessar.'}
          </p>
        </section>
      {/if}

      <!-- Add Member Section -->
      <section class="space-y-3">
        <h4 class="text-xs font-bold uppercase tracking-wider text-base-content/50 px-1">Convidar Pessoas</h4>
        <div class="flex flex-col gap-2 p-1 bg-base-200/50 rounded-2xl border border-base-content/5">
          <div class="flex items-center gap-2 p-1 w-full">
            <div class="flex-1 flex items-center gap-2 px-3 bg-base-100 border border-base-content/10 rounded-xl h-9 focus-within:border-primary/50 transition-all duration-200 min-w-0">
              <Mail class="w-4 h-4 opacity-40 shrink-0" />
              <input 
                type="email" 
                placeholder="nome@exemplo.com" 
                class="bg-transparent border-none text-sm focus:outline-none w-full min-w-0 h-full"
                bind:value={inviteInput}
                onkeydown={(e) => e.key === 'Enter' && $addMemberMutation.mutate()}
              />
            </div>
            <select class="select select-bordered select-sm border-base-content/10 bg-base-100 text-xs h-9 w-28 shrink-0 focus:outline-none" bind:value={inviteRole}>
              <option value="editor">Editor</option>
              <option value="viewer">Leitor</option>
            </select>
            <button 
              class="btn btn-primary btn-sm px-4 h-9 min-h-0 shrink-0" 
              disabled={$addMemberMutation.isPending || !inviteInput.trim()}
              onclick={() => $addMemberMutation.mutate()}
            >
              {#if $addMemberMutation.isPending}
                <span class="loading loading-spinner loading-xs"></span>
              {:else}
                Convidar
              {#if !$addMemberMutation.isPending}
                <div class="hidden sm:inline ml-1"></div>
              {/if}
              {/if}
            </button>
          </div>
        </div>
      </section>

      <!-- Invite Links Section -->
      <section class="space-y-3">
        <h4 class="text-xs font-bold uppercase tracking-wider text-base-content/50">Links de Convite</h4>
        <div class="grid gap-4">
          <!-- Editor Link -->
          <div class="space-y-2">
            <div class="flex items-center justify-between px-1">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                <span class="text-xs font-bold">Link de Editor</span>
              </div>
              {#if isOwner && $editorInviteQuery.data}
                <button class="btn btn-ghost btn-xs gap-1 hover:text-error transition-colors" onclick={() => $resetLinkMutation.mutate('editor')}>
                  <RefreshCw class="w-3 h-3" />
                  Resetar
                </button>
              {/if}
            </div>
            <div 
              role="button"
              tabindex="0"
              class="relative flex items-center gap-3 p-2 bg-base-300/50 hover:bg-base-300 rounded-xl border border-base-content/5 cursor-pointer transition-all group overflow-hidden"
              onclick={() => $editorInviteQuery.data && copyLink($editorInviteQuery.data, 'editor')}
              onkeydown={(e) => e.key === 'Enter' && $editorInviteQuery.data && copyLink($editorInviteQuery.data, 'editor')}
            >
              <div class="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                <UserCheck class="w-4 h-4" />
              </div>
              <div class="flex-1 min-w-0 font-mono text-[10px] opacity-70 truncate">
                {#if $editorInviteQuery.isLoading}
                  <div class="skeleton h-3 w-3/4"></div>
                {:else if $editorInviteQuery.data}
                  {window.location.origin}/invite/{$editorInviteQuery.data}
                {/if}
              </div>
              <div class="shrink-0 px-2">
                {#if copiedRole === 'editor'}
                  <Check class="w-4 h-4 text-success" />
                {:else}
                  <Copy class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                {/if}
              </div>
              {#if copiedRole === 'editor'}
                <div class="absolute inset-0 bg-success/10 flex items-center justify-center backdrop-blur-[1px] animate-in fade-in">
                  <span class="text-[10px] font-bold text-success uppercase tracking-widest">Copiado!</span>
                </div>
              {/if}
            </div>
          </div>

          <!-- Viewer Link -->
          <div class="space-y-2">
            <div class="flex items-center justify-between px-1">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-green-500"></div>
                <span class="text-xs font-bold">Link de Leitor</span>
              </div>
              {#if isOwner && $viewerInviteQuery.data}
                <button class="btn btn-ghost btn-xs gap-1 hover:text-error transition-colors" onclick={() => $resetLinkMutation.mutate('viewer')}>
                  <RefreshCw class="w-3 h-3" />
                  Resetar
                </button>
              {/if}
            </div>
            <div 
              role="button"
              tabindex="0"
              class="relative flex items-center gap-3 p-2 bg-base-300/50 hover:bg-base-300 rounded-xl border border-base-content/5 cursor-pointer transition-all group overflow-hidden"
              onclick={() => $viewerInviteQuery.data && copyLink($viewerInviteQuery.data, 'viewer')}
              onkeydown={(e) => e.key === 'Enter' && $viewerInviteQuery.data && copyLink($viewerInviteQuery.data, 'viewer')}
            >
              <div class="p-2 bg-green-500/10 text-green-500 rounded-lg">
                <Eye class="w-4 h-4" />
              </div>
              <div class="flex-1 min-w-0 font-mono text-[10px] opacity-70 truncate">
                {#if $viewerInviteQuery.isLoading}
                  <div class="skeleton h-3 w-3/4"></div>
                {:else if $viewerInviteQuery.data}
                  {window.location.origin}/invite/{$viewerInviteQuery.data}
                {/if}
              </div>
              <div class="shrink-0 px-2">
                {#if copiedRole === 'viewer'}
                  <Check class="w-4 h-4 text-success" />
                {:else}
                  <Copy class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                {/if}
              </div>
              {#if copiedRole === 'viewer'}
                <div class="absolute inset-0 bg-success/10 flex items-center justify-center backdrop-blur-[1px] animate-in fade-in">
                  <span class="text-[10px] font-bold text-success uppercase tracking-widest">Copiado!</span>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </section>

      <!-- Members List -->
      <section class="space-y-3">
        <h4 class="text-xs font-bold uppercase tracking-wider text-base-content/50">Membros Ativos</h4>
        <div class="space-y-2">
          {#if $membersQuery.isLoading}
            <div class="skeleton h-12 w-full rounded-xl"></div>
          {:else if $membersQuery.data}
            {#each $membersQuery.data as member}
              <div class="flex items-center gap-3 p-3 hover:bg-base-200/30 rounded-xl transition-colors group">
                <div class="avatar placeholder">
                  <div class="bg-primary/20 text-primary rounded-full w-8 flex items-center justify-center">
                    <span class="text-[10px] uppercase font-bold leading-none">{member.username.slice(0, 2)}</span>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium flex items-center gap-2">
                    {member.username}
                    {#if member.role === 'owner'}
                      <div class="badge badge-primary badge-xs py-2 px-2 text-[10px] font-bold uppercase tracking-tight">Dono</div>
                    {/if}
                  </div>
                  <div class="text-xs text-base-content/40 truncate">{member.email}</div>
                </div>
                <div class="flex items-center gap-2">
                  <div class="text-[10px] font-bold uppercase text-base-content/30 tracking-widest">{member.role}</div>
                  {#if isOwner && member.role !== 'owner'}
                    <button class="btn btn-ghost btn-xs btn-circle text-error opacity-0 group-hover:opacity-100 hover:bg-error/10" 
                      onclick={() => $removeMemberMutation.mutate(member.id)}
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </section>

      <!-- Template Section (Owners Only) -->
      {#if isOwner}
        <section class="pt-4 border-t border-base-200">
          <div class="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-3">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-primary/10 text-primary rounded-lg">
                <LayoutTemplate class="w-4 h-4" />
              </div>
              <h4 class="text-sm font-bold">Publicar como Template</h4>
            </div>
            <p class="text-xs text-base-content/60 leading-relaxed">
              Cria uma versão "blue-print" do seu projeto sem o histórico de edições. 
              Ideal para exercícios ou projetos base.
            </p>
            <button 
              class="btn btn-primary btn-sm w-full gap-2"
              onclick={() => $createTemplateMutation.mutate()}
              disabled={$createTemplateMutation.isPending}
            >
              {#if $createTemplateMutation.isPending}
                <span class="loading loading-spinner loading-xs"></span>
              {/if}
              Gerar Link de Template
            </button>
          </div>
        </section>
      {/if}
    </div>

    <div class="px-6 py-4 bg-base-200/30 flex justify-end">
      <button type="button" class="btn btn-ghost btn-sm" onclick={onClose}>Fechar</button>
    </div>
  </div>
</div>

<style>
  section {
    animation: fadeIn 0.3s ease-out forwards;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
