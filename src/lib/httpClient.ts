import { browser } from "$app/environment"
import { treaty } from "@elysiajs/eden"
import type { App } from "../backend"

const { api: httpClient } = treaty<App>(
	browser ? window.location.origin : "localhost:3000",
	{
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json"
		}
	}
)

export default httpClient
