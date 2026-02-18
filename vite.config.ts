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
    {
      name: "resolve-bun",
      enforce: "pre",
      resolveId(id) {
        if (id === "bun" || id.startsWith("bun:")) {
          return { id, external: true }
        }
      }
    },
    tailwindcss(),
    enhancedImages(),
    SvelteKitPWA(),
    sveltekit(),
    wasm(),
    visualizer(),
    devtoolsJson()
  ],
  build: {
    target: "esnext",
    rollupOptions: {
      external: ["bun"]
    }
  },
  server: {
    watch: {
      ignored: ["**/static/material-icons/**", "**/data/**"]
    }
  }
})
