import { treaty } from "@elysiajs/eden"
import type { App } from "backend"

const { api: httpClient } = treaty<App>("localhost:3000", {
	headers: {
		"Content-Type": "application/json",
		Accept: "application/json"
	},
	fetch: {
		credentials: "include"
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
