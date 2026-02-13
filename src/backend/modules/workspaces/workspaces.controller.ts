import { and, eq, inArray } from "drizzle-orm"
import Elysia, { t } from "elysia"
import { nanoid } from "nanoid"
import { v7 as randomUUIDv7 } from "uuid"
import {
  db,
  workspaceInvite,
  workspaces,
  workspaces__users
} from "../../database"
import { getSnapshot, getWorkspaceUpdates } from "../../lib/storage"
import authMiddleware from "../auth/auth.middleware"

const workspacesController = new Elysia({
  name: "api.workspaces",
  prefix: "/workspaces"
})
  .use(authMiddleware)
  .get(
    "/",
    async ({ userId, query: { limit, offset } }) => {
      return await db.query.workspaces.findMany({
        where: (workspaces) =>
          inArray(
            workspaces.id,
            db
              .select({ id: workspaces__users.workspaceId })
              .from(workspaces__users)
              .where(eq(workspaces__users.userId, userId))
          ),
        orderBy: (workspaces, { desc }) => desc(workspaces.updatedAt),
        limit: limit ?? 20,
        offset: offset ?? 0,
        columns: {
          id: true,
          name: true,
          createdAt: true,
          slug: true
        }
      })
    },
    {
      query: t.Object({
        limit: t.Optional(t.Number()),
        offset: t.Optional(t.Number())
      })
    }
  )
  .get("/:slug", async ({ params: { slug }, userId, status }) => {
    const user = await db.query.workspaces__users.findFirst({
      where: (fields) =>
        and(
          eq(fields.userId, userId),
          inArray(
            fields.workspaceId,
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

    const snapshot = await getSnapshot(workspace.id)
    const updates = await getWorkspaceUpdates(workspace.id)

    return {
      workspace,
      doc: snapshot,
      updates
    }
  })
  .post(
    "/",
    async ({ body: { name }, userId, status }) => {
      const id = randomUUIDv7()

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
    async ({ body: { users, role, workspaceId, ttl }, userId, status }) => {
      const user = await db.query.workspaces__users.findFirst({
        where: (fields) =>
          and(eq(fields.userId, userId), eq(fields.workspaceId, workspaceId)),
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
    async ({ params: { token }, user, status }) => {
      const invite = await db.query.workspaceInvite.findFirst({
        where: (fields) => eq(fields.token, token),
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
          where: (fields) =>
            and(
              eq(fields.userId, user.id),
              eq(fields.workspaceId, invite.workspaceId)
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
