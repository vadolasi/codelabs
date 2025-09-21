import { browser } from "$app/environment"
import { treaty } from "@elysiajs/eden"
import { Packr } from "msgpackr"
import type { App } from "../backend"

const packr = new Packr({
	bundleStrings: true
})

export function getHttpClient(url: string, fetch: typeof window.fetch) {
	const { api: httpClient } = treaty<App>(url, {
		onRequest: (_path, { body }) => {
			if (body !== undefined && typeof body !== "string") {
				return {
					headers: {
						"content-type": "application/x-msgpack"
					},
					body: new Uint8Array(packr.pack(body))
				}
			}
		},
		onResponse: async (response) => {
			if (
				response.headers
					.get("Content-Type")
					?.startsWith("application/x-msgpack")
			) {
				return packr.unpack(new Uint8Array(await response.arrayBuffer()))
			}
		},
		headers: {
			accept: "application/x-msgpack"
		},
		fetcher: fetch
	})

	return httpClient
}

const httpClient = browser
	? getHttpClient(window.location.origin, fetch)
	: getHttpClient("/", fetch)

export default httpClient
