import { defineConfig, presetUno, presetAttributify, presetIcons } from "unocss"

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify({
      prefix: "_",
      prefixedOnly: true
    }),
    presetIcons()
  ]
})
