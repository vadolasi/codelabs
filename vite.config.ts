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
    SvelteKitPWA({
      manifest: {
        name: "Codelabs",
        short_name: "Codelabs",
        description:
          "IDE Online completa com colaboração em tempo real voltada para salas de aula",
        theme_color: "#1e1e2e",
        icons: [
          {
            src: "web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "web-app-manifest-512x512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"]
      },
      devOptions: {
        enabled: true
      }
    }),
    sveltekit(),
    wasm(),
    visualizer(),
    devtoolsJson()
  ],
  ssr: {
    external: ["bun", "bun:sqlite"]
  },
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
