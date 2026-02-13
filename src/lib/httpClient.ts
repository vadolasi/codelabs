import { treaty } from "@elysiajs/eden"
import { Packr } from "msgpackr"
import { browser } from "$app/environment"
import type { App } from "../backend"

const packr = new Packr({ bundleStrings: true })

export function getHttpClient(url: string, fetch: typeof window.fetch) {
  const { api: httpClient } = treaty<App>(url, {
    fetcher: fetch,
    onRequest: (_path, { body }) => {
      if (body !== undefined && typeof body !== "string") {
        return {
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
    }
  })

  return httpClient
}

const httpClient = getHttpClient(browser ? window.location.origin : "/", fetch)

export default httpClient
