import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react-swc";
import million from "million/compiler";
import { defineConfig } from "vite";
import { analyzer } from "vite-bundle-analyzer";
import { compression } from "vite-plugin-compression2";
import Pages from "vite-plugin-pages";
import { VitePWA } from "vite-plugin-pwa";
import topLevelAwait from "vite-plugin-top-level-await";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [
    basicSsl(),
    million.vite({ auto: true }),
    react(),
    Pages(),
    wasm(),
    topLevelAwait(),
    // VitePWA({ registerType: "autoUpdate" }),
    compression(),
    analyzer(),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        ws: true,
      },
    },
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
});
