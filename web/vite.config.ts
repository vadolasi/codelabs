import { enhancedImages } from "@sveltejs/enhanced-img"
import { sveltekit } from "@sveltejs/kit/vite"
import tailwindcss from "@tailwindcss/vite"
import { visualizer } from "rollup-plugin-visualizer"
import { defineConfig } from "vite"
import devtoolsJson from "vite-plugin-devtools-json"
import wasm from "vite-plugin-wasm"

export default defineConfig({
	plugins: [
		tailwindcss(),
		enhancedImages(),
		sveltekit(),
		wasm(),
		visualizer(),
		devtoolsJson()
	],
	define: {
		"process.env": {
			NODE_ENV: process.env.NODE_ENV || "development"
		}
	},
	build: {
		target: "esnext"
	}
})
