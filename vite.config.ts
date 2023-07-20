import { defineConfig } from "vite"
import preact from "@preact/preset-vite"
import UnoCSS from "unocss/vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    UnoCSS(),
    preact(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true
      }
    })
  ]
})
