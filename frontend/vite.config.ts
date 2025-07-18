import { enhancedImages } from "@sveltejs/enhanced-img"
import { sveltekit } from "@sveltejs/kit/vite"
import tailwindcss from "@tailwindcss/vite"
import { SvelteKitPWA } from "@vite-pwa/sveltekit"
import { visualizer } from "rollup-plugin-visualizer"
import { defineConfig } from "vite"
import devtoolsJson from "vite-plugin-devtools-json"
// import topLevelAwait from "vite-plugin-top-level-await"
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
		// topLevelAwait(),
		visualizer(),
		devtoolsJson()
	],
	define: {
		"process.env": {}
	},
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:8000",
				ws: true
			}
		}
	},
	build: {
		target: "esnext"
	}
})
