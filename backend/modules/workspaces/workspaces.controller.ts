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
				content: true,
				slug: true
			}
		})
	})
	.get("/:slug", async ({ params: { slug }, userId, status }) => {
		const workspace = await db.query.workspaces.findFirst({
			where: (workspaces, { eq, and }) =>
				and(eq(workspaces.slug, slug), eq(workspaces.userId, userId)),
			columns: {
				id: true,
				name: true,
				slug: true,
				content: true,
				updatedAt: true
			}
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
		}

		return workspace
	})
	.post(
		"/",
		async ({ body: { name }, userId }) => {
			const doc = new LoroDoc()

			const id = Bun.randomUUIDv7()

			const [data] = await db
				.insert(workspaces)
				.values({
					id,
					name,
					slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${id.slice(-8)}`,
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
		"/:slug",
		async ({ body: { name }, params: { slug }, userId }) => {
			const data = await db
				.update(workspaces)
				.set({
					name
				})
				.where(and(eq(workspaces.slug, slug), eq(workspaces.userId, userId)))
				.returning()

			return data[0]
		},
		{
			body: t.Object({
				name: t.Optional(t.String())
			})
		}
	)
	.ws("/:slug", {
		open: async (ws) => {
			const userId = ws.data.userId
			const workspaceSlug = ws.data.params.slug
			ws.subscribe(`workspace:${workspaceSlug}`)
			if ((await redis.lLen(`workspace:${workspaceSlug}#doc`)) < 1) {
				const workspace = await db.query.workspaces.findFirst({
					where: (workspaces, { eq, and }) =>
						and(
							eq(workspaces.slug, workspaceSlug),
							eq(workspaces.userId, userId)
						),
					columns: {
						content: true
					}
				})

				if (!workspace) {
					ws.close(1008, "Workspace not found")
					return
				}

				await redis.lPush(`workspace:${workspaceSlug}#doc`, workspace.content)
			}
		},
		message: async (ws, message) => {
			const workspaceSlug = ws.data.params.slug
			console.log(typeof message)

			ws.publish(`workspace:${workspaceSlug}`, message as Buffer)

			await redis.lPush(`workspace:${workspaceSlug}#doc`, message as Buffer)
		},
		close: async (ws) => {
			ws.unsubscribe(`workspace:${ws.data.params.slug}`)
		}
	})

export default workspacesController
