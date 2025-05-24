import type { FileSystemTree } from "@webcontainer/api"
import { and, eq } from "drizzle-orm"
import Elysia, { t } from "elysia"
import db, { workspaces } from "../../database"
import authMiddleware from "../auth/auth.middleware"

const workspacesController = new Elysia({
	name: "api.workspaces",
	prefix: "/workspaces"
})
	.use(authMiddleware)
	.get("/", ({ userId }) => {
		return db.query.workspaces.findMany({
			where: (workspaces, { eq }) => eq(workspaces.userId, userId),
			columns: {
				id: true,
				name: true,
				createdAt: true,
				updatedAt: true
			}
		})
	})
	.get("/:id", ({ params: { id }, userId }) => {
		return db.query.workspaces.findFirst({
			where: (workspaces, { eq, and }) =>
				and(eq(workspaces.id, id), eq(workspaces.userId, userId))
		})
	})
	.post(
		"/",
		async ({ body: { name }, userId }) => {
			const data = await db
				.insert(workspaces)
				.values({
					name: name,
					userId
				})
				.returning()

			return data[0]
		},
		{
			body: t.Object({
				name: t.String()
			})
		}
	)
	.patch(
		"/:id",
		async ({ body: { name, content }, params: { id }, userId }) => {
			const data = await db
				.update(workspaces)
				.set({
					name,
					content: content as FileSystemTree
				})
				.where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)))
				.returning()

			return data[0]
		},
		{
			body: t.Object({
				name: t.Optional(t.String()),
				content: t.Optional(t.Unknown({}))
			})
		}
	)

export default workspacesController
