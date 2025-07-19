import { treaty } from "@elysiajs/eden"
import type { App } from "backend"
import { Packr } from "msgpackr"

export default function getHttpClient(fetchFn: typeof fetch) {
	const packr = new Packr({ bundleStrings: true })
	const httpClient = treaty<App>("localhost:3000/api", {
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
		fetcher: fetchFn,
		headers: {
			accept: "application/x-msgpack"
		}
	})

	return httpClient
}
