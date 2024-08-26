import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react-swc";
// import million from "million/compiler";
import { defineConfig } from "vite";
import Pages from "vite-plugin-pages";
import topLevelAwait from "vite-plugin-top-level-await";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [
    basicSsl(),
    tailwindcss(),
    // million.vite({ auto: true }),
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
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
});
