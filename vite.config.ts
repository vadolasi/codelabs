import { defineConfig } from "vite"
import preact from "@preact/preset-vite"
import UnoCSS from "unocss/vite"

export default defineConfig({
  plugins: [UnoCSS(), preact()]
})
