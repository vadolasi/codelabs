// See https://svelte.dev/docs/kit/types#app.d.ts

import type httpClient from "$lib/httpClient"

declare global {
  namespace App {
    interface Locals {
      user: Awaited<
        ReturnType<(typeof httpClient)["users"]["me"]["get"]>
      >["data"]
    }
    interface Platform {
      server: Bun.Server
      request: Request
    }
  }
}
