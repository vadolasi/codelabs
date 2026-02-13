import engine from "./src/backend/realtime"

Bun.serve({
  ...engine.handler(),
  async fetch(req, server) {
    const res = await engine.handleRequest(req, server)

    res.headers.set("Access-Control-Allow-Origin", "*")
    res.headers.set("Access-Control-Allow-Credentials", "true")
    res.headers.set("Access-Control-Allow-Methods", "*")
    res.headers.set("Access-Control-Allow-Headers", "*")

    return res
  },
  idleTimeout: 30,
  port: 5174
})

console.log("Real-time server running on port 5174")
