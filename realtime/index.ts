import { Server as Engine } from "@socket.io/bun-engine"
import { CookieMap, RedisClient, serve } from "bun"
import { Server } from "socket.io"
import parser from "socketio-msgpack-parser"
import type { Session } from "web/src/backend/modules/auth/auth.service"
import type {
	ClientToServerEvents,
	ServerToClientEvents
} from "web/src/components/Editor/socket-io-types"

export type InterServerEvents = Record<string, never>

export type SocketData = {
	userId: string
	conferenceId?: string
}

const redis = new RedisClient(process.env.REDIS_URL!)
await redis.connect()

const io = new Server<
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
>({
	parser,
	cors: {
		origin: "http://localhost:5173",
		methods: ["GET", "POST"],
		credentials: true
	}
})

const engine = new Engine({
	path: "/socket.io/"
}).on("connection", (socket, request, server) => {
	// @ts-ignore
	socket.request = {
		// @ts-ignore
		headers: Object.fromEntries(request.headers.entries()),
		connection: {
			encrypted:
				request.url.startsWith("https") || request.url.startsWith("wss")
		}
	}
})

io.bind(engine)

io.use(async (socket, next) => {
	const sessionId = new CookieMap(socket.request.headers.cookie).get("session")
	const session = await redis.get(`session:${sessionId}`)

	if (session === null) {
		return next(new Error("not authorized"))
	}

	const result = JSON.parse(session)
	const sessionData: Session = {
		id: result.id,
		userId: result.user_id,
		expiresAt: new Date(result.expires_at * 1000)
	}

	if (Date.now() >= sessionData.expiresAt.getTime()) {
		return next(new Error("not authorized"))
	}

	socket.data.userId = sessionData.userId

	const conferenceId = socket.handshake.query.conferenceId

	if (conferenceId && typeof conferenceId !== "string") {
		return next(new Error("invalid conferenceId"))
	}

	if (conferenceId) {
		socket.data.conferenceId = conferenceId
	}

	next()
})

io.on("connection", async (socket) => {
	const workspaceId = socket.handshake.query.workspaceId

	if (typeof workspaceId === "string" && workspaceId) {
		socket.join(`workspace-${workspaceId}`)
	}

	socket.on("connect-to-workspace", async (workspaceId) => {
		socket.join(`workspace-${workspaceId}`)
	})

	socket.on("disconnect-from-workspace", async (workspaceId) => {
		socket.leave(`workspace-${workspaceId}`)
	})

	socket.on("loro-update", async (workspaceId, update) => {
		socket.broadcast.to(`workspace-${workspaceId}`).emit("loro-update", update)

		await redis.lpush(`workspace:${workspaceId}:doc`, Buffer.from(update))
	})

	socket.on("ephemeral-update", async (workspaceId, update) => {
		socket.broadcast
			.to(`workspace-${workspaceId}`)
			.emit("ephemeral-update", update)
	})
})

const handler = engine.handler()

serve({
	port: 3000,
	...handler,
	fetch: async (req, server) => {
		let res = await handler.fetch(req, server)

		if (!res) {
			res = new Response("Not found", { status: 404 })
		}

		res.headers.set(
			"Access-Control-Allow-Origin",
			process.env.NODE_ENV === "production"
				? `https://${process.env.DOMAIN}`
				: "http://localhost:5173"
		)
		res.headers.set("Access-Control-Allow-Credentials", "true")

		return res
	},
	development: process.env.NODE_ENV !== "production"
})

console.log("Realtime server listening on port 3000")
