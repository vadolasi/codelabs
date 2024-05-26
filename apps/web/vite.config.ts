import { defineConfig } from "vite"
import UnoCSS from "unocss/vite"
import million from "million/compiler"
import react from "@vitejs/plugin-react-swc"
import Pages from "vite-plugin-pages"
import wasm from "vite-plugin-wasm"
import topLevelAwait from "vite-plugin-top-level-await"

export default defineConfig({
  plugins: [
    UnoCSS(),
    million.vite({ auto: true }),
    react(),
    Pages(),
    wasm(),
    topLevelAwait()
  ]
})
