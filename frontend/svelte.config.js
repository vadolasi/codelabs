import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"
import adapter from "svelte-adapter-bun-next"

/** @type {import("@sveltejs/kit").Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: { adapter: adapter({ precompress: true }) }
}

export default config
