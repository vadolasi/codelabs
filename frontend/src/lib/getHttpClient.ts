import { treaty } from "@elysiajs/eden"
import type { App } from "backend"

export default function getHttpClient(fetchFn: typeof fetch) {
	const { api: httpClient } = treaty<App>("localhost:8000", {
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json"
		},
		fetch: {
			credentials: "include"
		}
	})

	return httpClient
}
