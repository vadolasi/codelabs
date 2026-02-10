// dev-proxy.mjs
// Proxy para Vite e Socket.IO (Bun) usando ES modules

import http from "node:http"
import { parse } from "node:url"
import httpProxy from "http-proxy"

const VITE_TARGET = "http://localhost:5173"
const REALTIME_TARGET = "http://localhost:5174"
const PORT = 3000

const proxy = httpProxy.createProxyServer({
  ws: true,
  changeOrigin: true
})

const server = http.createServer((req, res) => {
  const url = parse(req.url).pathname
  if (url.startsWith("/socket.io")) {
    proxy.web(req, res, { target: REALTIME_TARGET })
  } else {
    proxy.web(req, res, { target: VITE_TARGET })
  }
})

server.on("upgrade", (req, socket, head) => {
  const url = parse(req.url).pathname
  if (url.startsWith("/socket.io")) {
    proxy.ws(req, socket, head, { target: REALTIME_TARGET })
  } else {
    proxy.ws(req, socket, head, { target: VITE_TARGET })
  }
})

server.listen(PORT, () => {
  console.log(`Dev proxy rodando em http://localhost:${PORT}`)
  console.log(`Proxy /socket.io para ${REALTIME_TARGET}`)
  console.log(`Proxy restante para ${VITE_TARGET}`)
})
