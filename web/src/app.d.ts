// See https://svelte.dev/docs/kit/types#app.d.ts

import type httpClient from "$lib/httpClient"

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: Awaited<
				ReturnType<(typeof httpClient)["users"]["me"]["get"]>
			>["data"]
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}
