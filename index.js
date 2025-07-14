const express = require("express")
const { createProxyMiddleware } = require("http-proxy-middleware")

const app = express()
const port = 3000

const backendServer = createProxyMiddleware({
	target: "http://localhost:8000/api",
	changeOrigin: true,
	pathRewrite: {
		"^/api": ""
	}
})

app.use("/api", backendServer)

const frontendServer = createProxyMiddleware({
	target: "http://localhost:5173",
	changeOrigin: true
})

app.use("/", frontendServer)

const server = app.listen(port, () => {
	console.log(`Servidor proxy escutando na porta ${port}`)
})

server.on("upgrade", (req, socket, head) => {
	if (req.url.startsWith("/api")) {
		backendServer.upgrade(req, socket, head)
	} else {
		frontendServer.upgrade(req, socket, head)
	}
})
