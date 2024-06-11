import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import million from "million/compiler";
import react from "@vitejs/plugin-react-swc";
import Pages from "vite-plugin-pages";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
	plugins: [
		tailwindcss(),
		million.vite({ auto: true }),
		react(),
		Pages(),
		wasm(),
		topLevelAwait(),
	],
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:3000",
				ws: true,
			},
		},
	},
});
