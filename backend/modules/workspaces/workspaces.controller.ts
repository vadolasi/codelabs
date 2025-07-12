import { and, eq } from "drizzle-orm"
import Elysia, { t } from "elysia"
import { LoroDoc } from "loro-crdt"
import db, { workspaces } from "../../database"
import redis from "../../lib/redis"
import authMiddleware from "../auth/auth.middleware"

const workspacesController = new Elysia({
	name: "api.workspaces",
	prefix: "/workspaces"
})
	.use(authMiddleware)
	.get("/", async ({ userId }) => {
		return await db.query.workspaces.findMany({
			where: (workspaces, { eq }) => eq(workspaces.userId, userId),
			columns: {
				id: true,
				name: true,
				createdAt: true,
				updatedAt: true,
				content: true
			}
		})
	})
	.get("/:id", async ({ params: { id }, userId, status }) => {
		const workspace = await db.query.workspaces.findFirst({
			where: (workspaces, { eq, and }) =>
				and(eq(workspaces.id, id), eq(workspaces.userId, userId))
		})

		if (!workspace) {
			return status(404, { message: "Workspace not found" })
		}

		const workspaceContent = await redis.lRange(
			`workspace:${workspace.id}#doc`,
			0,
			-1
		)

		if (workspaceContent.length > 0) {
			const doc = new LoroDoc()
			doc.importBatch(workspaceContent)
			workspace.content = Buffer.from(doc.export({ mode: "snapshot" }))
			await redis
				.multi()
				.lTrim(`workspace:${workspace.id}#doc`, 1, 0)
				.lPush(`workspace:${workspace.id}#doc`, workspace.content)
				.execAsPipeline()
		}

		return workspace
	})
	.post(
		"/",
		async ({ body: { name }, userId }) => {
			const doc = new LoroDoc()
			const rootNode = doc.getTree("fileTree").createNode()
			rootNode.data.set("type", "folder")
			rootNode.data.set("name", "")
			const [data] = await db
				.insert(workspaces)
				.values({
					name: name,
					userId,
					content: Buffer.from(doc.export({ mode: "snapshot" }))
				})
				.returning()

			return data
		},
		{
			body: t.Object({
				name: t.String()
			})
		}
	)
	.patch(
		"/:id",
		async ({ body: { name }, params: { id }, userId }) => {
			const data = await db
				.update(workspaces)
				.set({
					name
				})
				.where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)))
				.returning()

			return data[0]
		},
		{
			body: t.Object({
				name: t.Optional(t.String())
			})
		}
	)
	.ws("/:id", {
		open: async (ws) => {
			const userId = ws.data.userId
			const workspaceId = ws.data.params.id
			ws.raw.subscribe(`workspace:${workspaceId}`)
			if ((await redis.lLen(`workspace:${workspaceId}#doc`)) < 1) {
				const workspace = await db.query.workspaces.findFirst({
					where: (workspaces, { eq, and }) =>
						and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)),
					columns: {
						content: true
					}
				})

				if (!workspace) {
					ws.close(1008, "Workspace not found")
					return
				}

				await redis.lPush(`workspace:${workspaceId}#doc`, workspace.content)
			}
		},
		message: async (ws, message) => {
			const workspaceId = ws.data.params.id

			ws.raw.publish(`workspace:${workspaceId}`, message as Buffer)

			await redis.lPush(`workspace:${workspaceId}#doc`, message as Buffer)
		},
		close: async (ws) => {
			ws.raw.unsubscribe(`workspace:${ws.data.params.id}`)
		}
	})

export default workspacesController
