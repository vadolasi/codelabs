import { browser } from "$app/environment"
import { env } from "$env/dynamic/private"
import { treaty } from "@elysiajs/eden"
import type { App } from "backend"
import { Packr } from "msgpackr"

const packr = new Packr({
	bundleStrings: true
})

export function getHttpClient(fetchFn: typeof fetch) {
	const { api: httpClient } = treaty<App>(
		browser ? window.location.origin : env.VERCEL_URL,
		{
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
			fetcher: fetchFn
		}
	)

	return httpClient
}

const httpClient = getHttpClient(fetch)

export default httpClient
