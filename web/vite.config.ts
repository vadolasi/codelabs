import { enhancedImages } from "@sveltejs/enhanced-img"
import { sveltekit } from "@sveltejs/kit/vite"
import tailwindcss from "@tailwindcss/vite"
import { SvelteKitPWA } from "@vite-pwa/sveltekit"
import { visualizer } from "rollup-plugin-visualizer"
import { defineConfig } from "vite"
import devtoolsJson from "vite-plugin-devtools-json"
import wasm from "vite-plugin-wasm"

export default defineConfig({
	plugins: [
		tailwindcss(),
		enhancedImages(),
		sveltekit(),
		SvelteKitPWA({
			workbox: {
				maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
			}
		}),
		wasm(),
		visualizer(),
		devtoolsJson()
	],
	define: {
		"process.env": {}
	},
	build: {
		target: "esnext"
	}
})
