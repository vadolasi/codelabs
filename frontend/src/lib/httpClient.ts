import { treaty } from "@elysiajs/eden"
import type { App } from "backend"
import { Packr } from "msgpackr"

const packr = new Packr({
	bundleStrings: true
})

const httpClient = treaty<App>("localhost:3000/api", {
	/*
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
  */
	onResponse: async (response) => {
		if (
			response.headers.get("Content-Type")?.startsWith("application/x-msgpack")
		) {
			return packr.unpack(new Uint8Array(await response.arrayBuffer()))
		}
	},
	headers: {
		accept: "application/x-msgpack"
	}
})

type GeneratePaths<T> = {
	[K in keyof T]-?: K extends string
		? // biome-ignore lint/suspicious/noExplicitAny: Work here
			T[K] extends (...args: any) => any
			? K
			: T[K] extends object
				? `${K}.${GeneratePaths<T[K]>}`
				: never
		: never
}[keyof T]

type Split<S extends string> = S extends `${infer T}.${infer U}`
	? [T, ...Split<U>]
	: [S]

type GetFromPath<T, Path extends string[]> = Path extends [
	infer Key,
	...infer Rest
]
	? Key extends keyof T
		? Rest extends string[]
			? GetFromPath<T[Key], Rest>
			: never
		: never
	: T

export type ApiData<TPath extends GeneratePaths<typeof httpClient>> =
	// biome-ignore lint/suspicious/noExplicitAny: Work here
	GetFromPath<typeof httpClient, Split<TPath>> extends (...args: any[]) => any
		? Awaited<
				ReturnType<GetFromPath<typeof httpClient, Split<TPath>>>
			> extends { data: infer D }
			? NonNullable<D>
			: never
		: never

export default httpClient
