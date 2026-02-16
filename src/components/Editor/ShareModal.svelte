<script lang="ts">
import { Check, Copy, Link as LinkIcon, Mail, Users, X } from "@lucide/svelte"
import { normalizeProps, useMachine } from "@zag-js/svelte"
import * as tabs from "@zag-js/tabs"
import httpClient from "$lib/httpClient"
import toaster from "../Toaster/store"

interface Props {
  workspace: {
    id: string
    name: string
  }
  onClose: () => void
}

const { workspace, onClose }: Props = $props()

const service = useMachine(tabs.machine, {
  id: "share-tabs",
  value: "link"
})
const api = $derived(tabs.connect(service, normalizeProps))

let role = $state<"editor" | "viewer">("editor")
let emailsInput = $state("")
let inviteToken = $state<string | null>(null)
let isLoading = $state(false)
let copied = $state(false)
let emailSent = $state(false)

const inviteUrl = $derived(inviteToken ? `${window.location.origin}/invite/${inviteToken}` : "")

async function generateInvite() {
  isLoading = true
  try {
    const { data, error } = await httpClient.workspaces.invite.post({
      workspaceId: workspace.id,
      role,
      users: null,
      ttl: null
    })

    if (error) throw new Error(error.value.message)
    inviteToken = data
  } catch (err) {
    let errorMessage = "Erro ao gerar convite"
    if (err instanceof Error) {
      errorMessage = err.message
    }
    toaster.create({
      title: "Erro ao gerar convite",
      description: errorMessage,
      type: "error"
    })
  } finally {
    isLoading = false
  }
}

async function sendEmailInvite() {
  if (!emailsInput.trim()) {
    toaster.create({
      title: "Erro",
      description: "Insira ao menos um e-mail",
      type: "error"
    })
    return
  }
  
  isLoading = true
  try {
    const users = emailsInput
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0)

    const { error } = await httpClient.workspaces.invite.post({
      workspaceId: workspace.id,
      role,
      users,
      ttl: 3600 * 24 * 7, // 1 week for email invites
      isEmail: true
    })

    if (error) throw new Error(error.value.message)
    emailSent = true
    emailsInput = ""
    toaster.create({
      title: "Sucesso",
      description: "Convites enviados com sucesso!",
      type: "success"
    })
  } catch (err) {
    let errorMessage = "Erro ao enviar convites"
    if (err instanceof Error) {
      errorMessage = err.message
    }
    toaster.create({
      title: "Erro ao enviar convites",
      description: errorMessage,
      type: "error"
    })
  } finally {
    isLoading = false
  }
}

async function copyToClipboard() {
  if (!inviteUrl) return
  await navigator.clipboard.writeText(inviteUrl)
  copied = true
  setTimeout(() => (copied = false), 2000)
}
</script>

<div
  role="button"
  tabindex={0}
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
  onclick={(e) => e.target === e.currentTarget && onClose()}
  onkeydown={(e) => e.key === "Escape" && onClose()}
>
  <div class="bg-base-100 rounded-box shadow-xl w-full max-w-md overflow-hidden">
    <div class="px-6 py-4 border-b border-base-200 flex items-center justify-between">
      <h3 class="text-lg font-bold flex items-center gap-2">
        <Users class="w-5 h-5" />
        Compartilhar Workspace
      </h3>
      <button type="button" class="btn btn-ghost btn-sm btn-circle" onclick={onClose}>
        <X class="w-4 h-4" />
      </button>
    </div>

    <div {...api.getRootProps()} class="w-full">
      <div {...api.getListProps()} class="tabs tabs-bordered w-full bg-base-200/30">
        <button
          type="button"
          {...api.getTriggerProps({ value: "link" })}
          class="tab flex-1 h-12 gap-2"
          class:tab-active={api.value === "link"}
        >
          <LinkIcon class="w-4 h-4" />
          Link
        </button>
        <button
          type="button"
          {...api.getTriggerProps({ value: "email" })}
          class="tab flex-1 h-12 gap-2"
          class:tab-active={api.value === "email"}
        >
          <Mail class="w-4 h-4" />
          E-mail
        </button>
      </div>

      <div class="p-6 space-y-4">
        <div class="form-control">
          <label class="label" for="role-select">
            <span class="label-text">Função</span>
          </label>
          <select class="select select-bordered w-full" id="role-select" bind:value={role}>
            <option value="editor">Editor (pode modificar arquivos)</option>
            <option value="viewer">Visualizador (apenas leitura)</option>
          </select>
        </div>

        <div {...api.getContentProps({ value: "link" })} class="space-y-4">
          <div class="form-control">
            {#if inviteToken}
              <div class="form-control animate-in fade-in slide-in-from-top-2">
                <label class="label" for="invite-link">
                  <span class="label-text">Link de convite</span>
                </label>
                <div class="join w-full">
                  <input
                    id="invite-link"
                    type="text"
                    readonly
                    value={inviteUrl}
                    class="input input-bordered join-item flex-1 text-sm"
                  />
                  <button type="button" class="btn btn-primary join-item" onclick={copyToClipboard}>
                    {#if copied}
                      <Check class="w-4 h-4" />
                    {:else}
                      <Copy class="w-4 h-4" />
                    {/if}
                  </button>
                </div>
              </div>
            {:else}
              <button
                type="button"
                class="btn btn-primary w-full gap-2"
                onclick={generateInvite}
                disabled={isLoading}
              >
                {#if isLoading}
                  <span class="loading loading-spinner loading-sm"></span>
                {:else}
                  <LinkIcon class="w-4 h-4" />
                {/if}
                Gerar Link de Convite
              </button>
            {/if}
          </div>
        </div>

        <div {...api.getContentProps({ value: "email" })} class="space-y-4 animate-in fade-in slide-in-from-right-2">
          <div class="form-control">
            <label class="label" for="emails-input-mail">
              <span class="label-text">E-mails dos convidados</span>
              <span class="label-text-alt">Obrigatório</span>
            </label>
            <textarea
              id="emails-input-mail"
              placeholder="ex: joao@email.com, maria@email.com"
              class="textarea textarea-bordered w-full h-24"
              bind:value={emailsInput}
            ></textarea>
          </div>

          <button
            type="button"
            class="btn btn-primary w-full gap-2"
            onclick={sendEmailInvite}
            disabled={isLoading || !emailsInput.trim()}
          >
            {#if isLoading}
              <span class="loading loading-spinner loading-sm"></span>
            {:else}
              <Mail class="w-4 h-4" />
            {/if}
            Enviar Convites por E-mail
          </button>
          
          {#if emailSent}
             <p class="text-xs text-success text-center font-medium animate-in fade-in">
               Convites enviados com sucesso!
             </p>
          {/if}
        </div>
      </div>
    </div>

    <div class="px-6 py-4 bg-base-200/50 flex justify-end">
      <button type="button" class="btn btn-ghost" onclick={onClose}>Fechar</button>
    </div>
  </div>
</div>
