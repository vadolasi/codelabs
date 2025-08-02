import db from "backend/database"
import redis from "backend/lib/redis"
import { validateSessionToken } from "backend/modules/auth/auth.service"
import { Packr } from "msgpackr"

const packr = new Packr({
	bundleStrings: true
})

Bun.serve<{ userId: string; workspaceId: string }, object>({
	port: 8080,
	async fetch(req, server) {
		const url = new URL(req.url)
		const workspaceId = url.pathname.split("/")[1]
		const cookies = new Map(
			req.headers
				.get("cookie")
				?.split("; ")
				.map((cookieStirng) => {
					const cookie = Bun.Cookie.parse(cookieStirng)
					return [cookie.name, cookie.value]
				}) || []
		)

		const sessionToken = cookies.get("session")

		if (!sessionToken) {
			return new Response("Unauthorized", { status: 401 })
		}

		const session = await validateSessionToken(sessionToken)

		if (!session) {
			return new Response("Unauthorized", { status: 401 })
		}

		const userId = session.userId

		if (!server.upgrade(req, { data: { workspaceId, userId } })) {
			return new Response("Upgrade failed", { status: 500 })
		}
	},
	websocket: {
		async open(ws) {
			const { userId, workspaceId } = ws.data
			ws.subscribe(`workspace:${workspaceId}`)
			if ((await redis.lLen(`workspace:${workspaceId}:doc`)) < 1) {
				const workspace = await db.query.workspaces.findFirst({
					where: (workspaces, { eq }) => eq(workspaces.slug, workspaceId),
					columns: {
						id: true
					}
				})

				if (!workspace) {
					ws.close(1008, "Workspace not found")
					return
				}
			}
			await redis.sAdd(`workspace:${workspaceId}:users`, userId)
		},
		async message(ws, message) {
			const { workspaceId } = ws.data

			ws.publish(`workspace:${workspaceId}`, message as Buffer)

			const { type, update } = packr.unpack(message as Buffer) as {
				type: "loro-update"
				update: ArrayBufferLike
			}

			if (type === "loro-update") {
				await redis.lPush(`workspace:${workspaceId}:doc`, Buffer.from(update))
			}
		},
		async close(ws) {
			const { userId, workspaceId } = ws.data
			await redis.sRem(`workspace:${workspaceId}:users`, userId)
			ws.unsubscribe(`workspace:${workspaceId}`)
		}
	}
})

console.log("Realtime server is running on port 8080")
