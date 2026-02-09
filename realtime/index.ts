import { Server as Engine } from "@socket.io/bun-engine"
import { CookieMap, RedisClient, S3Client, serve } from "bun"
import { Queue, Worker } from "bunqueue/client"
import { LoroDoc } from "loro-crdt"
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

type SnapshotJob = {
	workspaceId: string
}

const SNAPSHOT_INTERVAL_MS = 60_000

const s3Config =
	process.env.S3_BUCKET &&
	process.env.S3_ENDPOINT &&
	(process.env.S3_ACCESS_KEY || process.env.S3_ACCESS_KEY_ID) &&
	(process.env.S3_SECRET_KEY || process.env.S3_SECRET_ACCESS_KEY)
		? {
				accessKeyId:
					process.env.S3_ACCESS_KEY_ID ?? process.env.S3_ACCESS_KEY ?? "",
				secretAccessKey:
					process.env.S3_SECRET_ACCESS_KEY ?? process.env.S3_SECRET_KEY ?? "",
				bucket: process.env.S3_BUCKET,
				endpoint: process.env.S3_ENDPOINT
			}
		: null

const s3 = s3Config ? new S3Client(s3Config) : null

const redis = new RedisClient(process.env.REDIS_URL!)

const snapshotQueue = new Queue<SnapshotJob>("workspace-snapshots", {
	embedded: true
})

const snapshotWorker = new Worker<SnapshotJob>(
	"workspace-snapshots",
	async (job) => {
		await refreshSnapshot(job.data.workspaceId)
	},
	{
		embedded: true,
		concurrency: 1
	}
)

snapshotWorker.on("failed", (job, err) => {
	console.error("Snapshot job failed", job?.id, err)
})

const activeWorkspaceCounts = new Map<string, number>()
const scheduledWorkspaces = new Set<string>()

async function refreshSnapshot(workspaceId: string) {
	if (!s3) {
		return
	}

	const snapshotKey = `workspace/${workspaceId}/snapshot.bin`
	const [savedSnapshot, updates] = await Promise.all([
		s3
			.file(snapshotKey)
			.arrayBuffer()
			.catch(() => null),
		redis.lrange(`workspace:${workspaceId}:doc`, 0, -1)
	])

	if (!savedSnapshot && updates.length === 0) {
		return
	}

	const doc = new LoroDoc()
	doc.detach()

	if (savedSnapshot) {
		doc.import(new Uint8Array(savedSnapshot))
	}

	if (updates.length > 0) {
		doc.importBatch(
			updates.map((update: string | Uint8Array) => Buffer.from(update))
		)
	}

	const snapshot = doc.export({ mode: "snapshot" })
	await s3.write(snapshotKey, Buffer.from(snapshot))

	if (updates.length > 0) {
		await redis.ltrim(`workspace:${workspaceId}:doc`, updates.length, -1)
	}
}

function getSchedulerId(workspaceId: string) {
	return `workspace-snapshot:${workspaceId}`
}

async function ensureScheduler(workspaceId: string) {
	if (scheduledWorkspaces.has(workspaceId)) {
		return
	}

	await snapshotQueue.upsertJobScheduler(
		getSchedulerId(workspaceId),
		{ every: SNAPSHOT_INTERVAL_MS },
		{
			name: "snapshot",
			data: { workspaceId }
		}
	)

	scheduledWorkspaces.add(workspaceId)
}

async function removeScheduler(workspaceId: string) {
	if (!scheduledWorkspaces.has(workspaceId)) {
		return
	}

	await snapshotQueue.removeJobScheduler(getSchedulerId(workspaceId))
	scheduledWorkspaces.delete(workspaceId)
}

async function markWorkspaceActive(workspaceId: string) {
	const count = (activeWorkspaceCounts.get(workspaceId) ?? 0) + 1
	activeWorkspaceCounts.set(workspaceId, count)
	if (count === 1) {
		await ensureScheduler(workspaceId)
	}
}

async function markWorkspaceInactive(workspaceId: string) {
	const nextCount = (activeWorkspaceCounts.get(workspaceId) ?? 0) - 1
	if (nextCount <= 0) {
		activeWorkspaceCounts.delete(workspaceId)
		await removeScheduler(workspaceId)
		return
	}

	activeWorkspaceCounts.set(workspaceId, nextCount)
}

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
	const joinedWorkspaces = new Set<string>()

	if (typeof workspaceId === "string" && workspaceId) {
		socket.join(`workspace-${workspaceId}`)
		joinedWorkspaces.add(workspaceId)
		await markWorkspaceActive(workspaceId)
	}

	socket.on("connect-to-workspace", async (workspaceId) => {
		socket.join(`workspace-${workspaceId}`)
		joinedWorkspaces.add(workspaceId)
		await markWorkspaceActive(workspaceId)
	})

	socket.on("disconnect-from-workspace", async (workspaceId) => {
		socket.leave(`workspace-${workspaceId}`)
		if (joinedWorkspaces.has(workspaceId)) {
			joinedWorkspaces.delete(workspaceId)
			await markWorkspaceInactive(workspaceId)
		}
	})

	socket.on("disconnect", async () => {
		await Promise.all(
			Array.from(joinedWorkspaces).map((workspaceId) =>
				markWorkspaceInactive(workspaceId)
			)
		)
		joinedWorkspaces.clear()
	})

	socket.on("loro-update", async (workspaceId, update) => {
		socket.broadcast.to(`workspace-${workspaceId}`).emit("loro-update", update)

		await redis.lpush(`workspace:${workspaceId}:doc`, Buffer.from(update))
	})

	socket.on("persist-snapshot", async (workspaceId, snapshot) => {
		if (!s3) {
			return
		}

		const key = `workspace/${workspaceId}/snapshot.bin`
		await s3.write(key, Buffer.from(snapshot))
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
