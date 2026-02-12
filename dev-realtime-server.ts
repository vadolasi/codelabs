import engine from "./src/backend/realtime"

Bun.serve({
  ...engine.handler(),
  idleTimeout: 30,
  port: 5174
})

console.log("Real-time server running on port 5174")
