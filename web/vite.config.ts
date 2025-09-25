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
	build: {
		target: "esnext"
	},
	assetsInclude: ["**/*.mjml.eta"],
	server: {
		proxy: {
			"/socket.io": {
				target: "ws://localhost:3000",
				ws: true,
				changeOrigin: true
			}
		}
	}
})
