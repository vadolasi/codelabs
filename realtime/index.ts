import { Server as Engine } from "@socket.io/bun-engine"
import { Server } from "socket.io"

const io = new Server()

const engine = new Engine({
	path: "/socket.io/"
})

io.bind(engine)

io.on("connection", (socket) => {
	console.log("a user connected")
})

export default {
	port: 3000,
	...engine.handler()
}
