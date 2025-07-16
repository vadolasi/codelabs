import { and, eq } from "drizzle-orm"
import Elysia, { t } from "elysia"
import { LoroDoc } from "loro-crdt"
import { Packr } from "msgpackr"
import db, { workspaces } from "../../database"
import redis from "../../lib/redis"
import authMiddleware from "../auth/auth.middleware"

const packr = new Packr()

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
			`workspace:${workspace.slug}#doc`,
			0,
			-1
		)

		if (workspaceContent.length > 0) {
			const doc = new LoroDoc()
			doc.detach()
			doc.importBatch(workspaceContent)
			workspace.content = Buffer.from(doc.export({ mode: "snapshot" }).buffer)
		}

		return workspace
	})
	.post(
		"/",
		async ({ body: { name }, userId }) => {
			const doc = new LoroDoc()
			doc.detach()

			const id = Bun.randomUUIDv7()

			const [data] = await db
				.insert(workspaces)
				.values({
					id,
					name,
					slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${id.slice(-8)}`,
					userId
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

				if (workspace.content) {
					await redis.lPush(`workspace:${workspaceSlug}#doc`, workspace.content)
				}
			}
		},
		message: async (ws, message) => {
			const workspaceSlug = ws.data.params.slug

			ws.publish(`workspace:${workspaceSlug}`, message as Buffer)

			const { type, update } = packr.unpack(message as Buffer) as {
				type: "loro-update"
				update: ArrayBufferLike
			}

			if (type === "loro-update") {
				await redis.lPush(`workspace:${workspaceSlug}#doc`, Buffer.from(update))
			}
		},
		close: async (ws) => {
			ws.unsubscribe(`workspace:${ws.data.params.slug}`)
		}
	})

export default workspacesController
