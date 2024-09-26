import MillionLint from "@million/lint";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import Pages from "vite-plugin-pages";
import { VitePWA } from "vite-plugin-pwa";
import topLevelAwait from "vite-plugin-top-level-await";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [
    basicSsl(),
    MillionLint.vite(),
    react(),
    Pages(),
    wasm(),
    topLevelAwait(),
    VitePWA({ registerType: "autoUpdate" }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        ws: true,
      },
    },
    headers: {
      "Cross-Origin-Embedder-Policy": "credentialless",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
});
