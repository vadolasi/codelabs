import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"
import adapter from "svelte-adapter-bun"

const config = {
	preprocess: vitePreprocess(),
	kit: { adapter: adapter() }
}

export default config
