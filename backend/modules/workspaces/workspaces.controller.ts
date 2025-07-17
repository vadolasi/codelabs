import { eq } from "drizzle-orm"
import Elysia, { t } from "elysia"
import { LoroDoc } from "loro-crdt"
import { Packr } from "msgpackr"
import db, { workspaces, workspaces__users } from "../../database"
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
				slug: true
			}
		})
	})
	.get("/:slug", async ({ params: { slug }, userId, status }) => {
		const userAlreadyInWorkspace = await redis.sIsMember(
			`workspace:${slug}:users`,
			userId
		)

		if (userAlreadyInWorkspace) {
			return status(400, { message: "You are already in this workspace" })
		}

		const user = await db.query.workspaces__users.findFirst({
			where: (workspaces__users, { eq, and, inArray }) =>
				and(
					eq(workspaces__users.userId, userId),
					inArray(
						workspaces__users.workspaceId,
						db
							.select({ id: workspaces.id })
							.from(workspaces)
							.where(eq(workspaces.slug, slug))
					)
				),
			columns: {
				role: true
			},
			with: {
				workspace: {
					columns: {
						id: true,
						name: true,
						slug: true,
						content: true,
						updatedAt: true
					}
				}
			}
		})

		if (!user) {
			return status(404, { message: "Workspace not found" })
		}

		const workspace = user.workspace

		const workspaceUpdates = await redis.lRange(`workspace:${slug}:doc`, 0, -1)

		if (workspaceUpdates.length > 0) {
			const doc = new LoroDoc()
			doc.detach()
			doc.importBatch([workspace.content, ...workspaceUpdates])

			db.update(workspaces)
				.set({ content: workspace.content })
				.where(eq(workspaces.id, workspace.id))

			redis.lTrim(`workspace:${slug}:doc`, workspaceUpdates.length, -1)

			workspace.content = Buffer.from(doc.export({ mode: "snapshot" }).buffer)
		}

		return workspace
	})
	.post(
		"/",
		async ({ body: { name }, userId, status }) => {
			const doc = new LoroDoc()
			doc.detach()

			const id = Bun.randomUUIDv7()

			const [data] = await db
				.insert(workspaces)
				.values({
					id,
					name,
					slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${id.slice(-8)}`,
					content: Buffer.from(doc.export({ mode: "snapshot" }).buffer),
					userId
				})
				.returning()

			if (!data) {
				return status(500, { message: "Failed to create workspace" })
			}

			await db.insert(workspaces__users).values({
				id: Bun.randomUUIDv7(),
				userId,
				workspaceId: data.id,
				role: "owner"
			})

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
		async ({ body: { name }, params: { slug } }) => {
			const data = await db
				.update(workspaces)
				.set({
					name
				})
				.where(eq(workspaces.slug, slug))
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
			if ((await redis.lLen(`workspace:${workspaceSlug}:doc`)) < 1) {
				const workspace = await db.query.workspaces.findFirst({
					where: (workspaces, { eq }) => eq(workspaces.slug, workspaceSlug),
					columns: {
						content: true
					}
				})

				if (!workspace) {
					ws.close(1008, "Workspace not found")
					return
				}
			}
			await redis.sAdd(`workspace:${workspaceSlug}:users`, userId)
		},
		message: async (ws, message) => {
			const workspaceSlug = ws.data.params.slug

			ws.publish(`workspace:${workspaceSlug}`, message as Buffer)

			const { type, update } = packr.unpack(message as Buffer) as {
				type: "loro-update"
				update: ArrayBufferLike
			}

			if (type === "loro-update") {
				await redis.lPush(`workspace:${workspaceSlug}:doc`, Buffer.from(update))
			}
		},
		close: async (ws) => {
			const workspaceSlug = ws.data.params.slug
			const userId = ws.data.userId
			await redis.sRem(`workspace:${workspaceSlug}:users`, userId)
			ws.unsubscribe(`workspace:${workspaceSlug}`)
		}
	})

export default workspacesController
