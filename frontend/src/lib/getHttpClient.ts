import { treaty } from "@elysiajs/eden"
import type { App } from "backend"
import { Packr } from "msgpackr"

export default function getHttpClient(fetchFn: typeof fetch) {
	const packr = new Packr({ bundleStrings: true })
	const { api: httpClient } = treaty<App>("localhost:3000", {
		onRequest: (_path, options) => {
			if (options.body !== undefined) {
				return {
					headers: {
						"content-type": "application/x-msgpack"
					},
					body: new Uint8Array(packr.pack(options.body))
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
		fetcher: fetchFn,
		headers: {
			accept: "application/x-msgpack"
		}
	})

	return httpClient
}
