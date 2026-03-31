import { enhancedImages } from "@sveltejs/enhanced-img"
import { sveltekit } from "@sveltejs/kit/vite"
import tailwindcss from "@tailwindcss/vite"
import { SvelteKitPWA } from "@vite-pwa/sveltekit"
import daisyui from "daisyui"
import { visualizer } from "rollup-plugin-visualizer"
import { defineConfig } from "vite"
import devtoolsJson from "vite-plugin-devtools-json"
import wasm from "vite-plugin-wasm"
import catppuccin from "./src/catppuccinTheme.mocha"

export default defineConfig({
  resolve: {
    dedupe: [
      "@codemirror/state",
      "@codemirror/view",
      "@codemirror/language",
      "@codemirror/autocomplete",
      "@codemirror/commands",
      "@codemirror/lint",
      "@codemirror/search",
      "@lezer/common",
      "@lezer/highlight",
      "@lezer/lr"
    ]
  },
  optimizeDeps: {
    exclude: [
      "@catppuccin/codemirror",
      "loro-codemirror",
      "@replit/codemirror-lang-svelte",
      "@codemirror/autocomplete",
      "@codemirror/commands",
      "@codemirror/language",
      "@codemirror/lint",
      "@codemirror/search",
      "@codemirror/state",
      "@codemirror/view",
      "@codemirror/lang-cpp",
      "@codemirror/lang-css",
      "@codemirror/lang-html",
      "@codemirror/lang-javascript",
      "@codemirror/lang-jinja",
      "@codemirror/lang-json",
      "@codemirror/lang-markdown",
      "@codemirror/lang-python",
      "@codemirror/lang-sass",
      "@codemirror/lang-sql",
      "@codemirror/lang-vue",
      "@codemirror/lang-wast",
      "@codemirror/lang-xml",
      "@codemirror/lang-yaml",
      "@lezer/common",
      "@lezer/highlight",
      "@lezer/lr"
    ]
  },
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
    tailwindcss({
      plugins: [daisyui, catppuccin],
      daisyui: {
        themes: [
          {
            catppuccin: catppuccin
          }
        ]
      }
    }),
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
        enabled: false
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
