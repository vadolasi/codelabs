import { eq } from "drizzle-orm"
import Elysia, { t } from "elysia"
import { nanoid } from "nanoid"
import { S3mini } from "s3mini"
import { v7 as randomUUIDv7 } from "uuid"
import {
	getDb,
	workspaceInvite,
	workspaces,
	workspaces__users
} from "../../database"
import config from "../../lib/config"
import exposePlatform from "../../lib/expose-platform"
import redis from "../../lib/redis"
import authMiddleware from "../auth/auth.middleware"

const s3Endpoint = `${config.S3_ENDPOINT.replace(/\/$/, "")}/${config.S3_BUCKET}`
const s3 = new S3mini({
	accessKeyId: config.S3_ACCESS_KEY,
	secretAccessKey: config.S3_SECRET_KEY,
	endpoint: s3Endpoint,
	region: config.S3_REGION ?? "auto"
})

const workspacesController = new Elysia({
	name: "api.workspaces",
	prefix: "/workspaces"
})
	.use(exposePlatform)
	.use(authMiddleware)
	.get("/", async ({ userId, platform }) => {
		const db = getDb(platform.env)

		return await db.query.workspaces.findMany({
			where: (workspaces, { inArray }) =>
				inArray(
					workspaces.id,
					db
						.select({ id: workspaces__users.workspaceId })
						.from(workspaces__users)
						.where(eq(workspaces__users.userId, userId))
				),
			columns: {
				id: true,
				name: true,
				createdAt: true,
				slug: true
			}
		})
	})
	.get("/:slug", async ({ params: { slug }, userId, status, platform }) => {
		const db = getDb(platform.env)

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
						updatedAt: true
					}
				}
			}
		})

		if (!user) {
			return status(404, { message: "Workspace not found" })
		}

		const workspace = user.workspace

		const snapshotKey = `workspace/${workspace.id}/snapshot.bin`

		const [savedSnapshot, updates] = await Promise.all([
			s3.getObjectArrayBuffer(snapshotKey),
			redis.lRange(`workspace:${workspace.id}:doc`, 0, -1)
		])

		const snapshot = savedSnapshot ? new Uint8Array(savedSnapshot) : null

		return {
			workspace,
			doc: snapshot ? Buffer.from(snapshot) : null,
			updates
		}
	})
	.post(
		"/",
		async ({ body: { name }, userId, status, platform }) => {
			const id = randomUUIDv7()

			const db = getDb(platform.env)

			const [data] = await db
				.insert(workspaces)
				.values({
					id,
					name,
					slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${nanoid(8)}`
				})
				.returning()

			if (!data) {
				return status(500, { message: "Failed to create workspace" })
			}

			await db.insert(workspaces__users).values({
				id: randomUUIDv7(),
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
	.post(
		"/invite",
		async ({
			body: { users, role, workspaceId, ttl },
			userId,
			status,
			platform
		}) => {
			const db = getDb(platform.env)

			const user = await db.query.workspaces__users.findFirst({
				where: (workspaces__users, { eq }) =>
					eq(workspaces__users.userId, userId) &&
					eq(workspaces__users.workspaceId, workspaceId),
				columns: {
					role: true
				}
			})

			if (!user) {
				return status(404, { message: "Workspace not found" })
			}

			if (!["owner", "admin"].includes(user.role)) {
				return status(403, { message: "You are not allowed to invite users" })
			}

			const token = nanoid(10)

			const formatedUsers =
				users?.map((user) => user.toLowerCase().trim()) ?? []

			await db.insert(workspaceInvite).values({
				id: randomUUIDv7(),
				workspaceId,
				role,
				users: formatedUsers.length > 0 ? formatedUsers : null,
				token,
				expiresAt: ttl ? new Date(Date.now() + ttl * 1000) : null
			})

			return token
		},
		{
			body: t.Object({
				users: t.Nullable(t.Array(t.String())),
				role: t.Union([
					t.Literal("owner"),
					t.Literal("admin"),
					t.Literal("editor"),
					t.Literal("viewer")
				]),
				workspaceId: t.String(),
				ttl: t.Nullable(t.Number())
			})
		}
	)
	.post(
		"/join/:token",
		async ({ params: { token }, user, status, platform }) => {
			const db = getDb(platform.env)

			const invite = await db.query.workspaceInvite.findFirst({
				where: (workspaceInvite, { eq }) => eq(workspaceInvite.token, token),
				columns: {
					workspaceId: true,
					expiresAt: true,
					users: true,
					role: true
				},
				with: {
					workspace: {
						columns: {
							slug: true
						}
					}
				}
			})

			if (!invite || (invite.expiresAt && invite.expiresAt < new Date())) {
				return status(404, { message: "Invite invalid or expired" })
			}

			if (invite.users) {
				if (
					!invite.users.includes(user.email) &&
					invite.users.includes(user.username)
				) {
					return status(404, { message: "Invite invalid or expired" })
				}
			}

			const userAlreadyInWorkspace = await db.query.workspaces__users.findFirst(
				{
					where: (workspaces__users, { eq, and }) =>
						and(
							eq(workspaces__users.userId, user.id),
							eq(workspaces__users.workspaceId, invite.workspaceId)
						),
					columns: {
						id: true
					}
				}
			)

			if (userAlreadyInWorkspace) {
				return status(400, { message: "You are already in this workspace" })
			}

			await db.insert(workspaces__users).values({
				id: randomUUIDv7(),
				userId: user.id,
				workspaceId: invite.workspaceId,
				role: invite.role
			})

			return { workspaceSlug: invite.workspace.slug }
		},
		{ user: true }
	)

export default workspacesController
