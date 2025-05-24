import { enhancedImages } from "@sveltejs/enhanced-img"
import { sveltekit } from "@sveltejs/kit/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import wasm from "vite-plugin-wasm"

export default defineConfig({
	plugins: [tailwindcss(), enhancedImages(), sveltekit(), wasm()]
})
