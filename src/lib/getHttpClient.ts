import { treaty } from "@elysiajs/eden"
import type { App } from "../backend"

export default function getHttpClient(fetchFn: typeof fetch) {
	const { api: httpClient } = treaty<App>("localhost:5173", {
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json"
		},
		fetcher: fetchFn
	})

	return httpClient
}
