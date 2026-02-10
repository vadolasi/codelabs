import engine from "./src/backend/realtime"

Bun.serve({
  ...engine.handler(),
  fetch(req, server) {
    const url = new URL(req.url)
    console.log(`Received request for ${url.pathname}`)
    return engine.handleRequest(req, server)
  },
  idleTimeout: 30,
  port: 5174
})

console.log("Real-time server running on port 5174")
