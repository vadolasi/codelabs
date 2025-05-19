<script lang="ts">
import { defaults, superForm } from "sveltekit-superforms"
import { zod, zodClient } from "sveltekit-superforms/adapters"
import { z } from "zod"
import FormField from "../../components/FormField.svelte"

const schema = z.object({
  email: z.string().min(1, "Este campo é obrigatório"),
  password: z.string().min(1, "Este campo é obrigatório")
})

const form = superForm(defaults(zod(schema)), {
  SPA: true,
  validators: zodClient(schema),
  onUpdate: async ({ result: { data } }) => {

  }
})
</script>

<div class="flex w-fulll min-h-screen items-center justify-center">
  <div class="card card-border bg-base-100 w-96 shadow-sm">
    <form class="card-body space-y-3" use:form.enhance>
      <h2 class="card-title">Entrar</h2>
      <FormField {form} field="email" label="Email" type="email" />
      <FormField {form} field="password" label="Senha" type="password" />
      <div class="card-actions">
        <button type="submit" class="btn btn-primary btn-block">Entrar</button>
        <div class="flex flex-col items-center w-full gap-3">
          <span class="text-sm text-base-content/50">Não tem uma conta? <a href="/register" class="link">Registrar</a></span>
          <span class="text-sm text-base-content/50 -mt-2"><a href="/forgot-password" class="link">Esqueceu a senha?</a></span>
        </div>
      </div>
    </form>
  </div>
</div>
