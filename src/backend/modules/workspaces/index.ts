import { randomUUIDv7 } from "bun"
import { and, eq, inArray } from "drizzle-orm"
import Elysia, { t } from "elysia"
import { nanoid } from "nanoid"
import {
  db,
  workspaceInvite,
  workspaces,
  workspaces__users
} from "../../database"
import sendEmail from "../../emails"
import { getSnapshot, getWorkspaceUpdates } from "../../lib/storage"
import authMiddleware from "../auth/auth.middleware"

const workspacesController = new Elysia({
  name: "api.workspaces",
  prefix: "/workspaces"
})
  .use(authMiddleware)
  // .use(hitlimit({ limit: 100, window: "1m", store: memoryStore() }))
  .get(
    "/",
    async ({ userId, query: { limit, offset, recent } }) => {
      const workspaces = await db.query.workspaces.findMany({
        where: (workspaces) =>
          inArray(
            workspaces.id,
            db
              .select({ id: workspaces__users.workspaceId })
              .from(workspaces__users)
              .where(eq(workspaces__users.userId, userId))
          ),
        orderBy: (workspaces, { desc }) => {
          if (recent) {
            return desc(
              db
                .select({ lastAccessedAt: workspaces__users.lastAccessedAt })
                .from(workspaces__users)
                .where(
                  and(
                    eq(workspaces__users.userId, userId),
                    eq(workspaces__users.workspaceId, workspaces.id)
                  )
                )
            )
          }
          return desc(workspaces.updatedAt)
        },
        limit: limit ?? 20,
        offset: offset ?? 0,
        columns: {
          id: true,
          name: true,
          createdAt: true,
          slug: true
        }
      })
      const workspacesWithRoles = await Promise.all(
        workspaces.map(async (workspace) => {
          const membership = await db.query.workspaces__users.findFirst({
            where: and(
              eq(workspaces__users.userId, userId),
              eq(workspaces__users.workspaceId, workspace.id)
            ),
            columns: {
              role: true
            }
          })
          return {
            ...workspace,
            role: membership?.role
          }
        })
      )

      return workspacesWithRoles
    },
    {
      query: t.Object({
        limit: t.Optional(t.Number()),
        offset: t.Optional(t.Number()),
        recent: t.Optional(t.Boolean())
      })
    }
  )
  .get("/:slug", async ({ params: { slug }, userId, status, headers }) => {
    if (headers.accept !== "application/x-msgpack") {
      return status(400, {
        message: "Client must accept application/x-msgpack"
      })
    }

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
            engine: true,
            updatedAt: true
          }
        }
      }
    })

    if (!user) {
      return status(404, { message: "Workspace not found" })
    }

    await db
      .update(workspaces__users)
      .set({ lastAccessedAt: new Date() })
      .where(
        and(
          eq(workspaces__users.userId, userId),
          eq(workspaces__users.workspaceId, user.workspace.id)
        )
      )

    const workspace = user.workspace

    const snapshot = await getSnapshot(workspace.id)
    const updates = await getWorkspaceUpdates(workspace.id)

    return {
      workspace: user.workspace,
      doc: snapshot,
      updates
    }
  })
  .post(
    "/",
    async ({ body: { name, engine }, userId, status }) => {
      const id = randomUUIDv7()

      const [data] = await db
        .insert(workspaces)
        .values({
          id,
          name,
          engine,
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
        name: t.String(),
        engine: t.Optional(
          t.Union([
            t.Literal("webcontainers"),
            t.Literal("skulpt"),
            t.Literal("pyodide")
          ])
        )
      })
    }
  )
  .post(
    "/invite",
    async ({
      body: { users, role, workspaceId, ttl, isEmail },
      userId,
      status
    }) => {
      const workspaceUser = await db.query.workspaces__users.findFirst({
        where: (fields) =>
          and(eq(fields.userId, userId), eq(fields.workspaceId, workspaceId)),
        columns: {
          role: true
        },
        with: {
          workspace: {
            columns: {
              name: true
            }
          }
        }
      })

      if (!workspaceUser) {
        return status(404, { message: "Workspace not found" })
      }

      if (!["owner", "admin"].includes(workspaceUser.role)) {
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

      if (isEmail && formatedUsers.length > 0) {
        await sendEmail("workspaceInvite", {
          subject: `Convite para o workspace ${workspaceUser.workspace.name}`,
          to: formatedUsers,
          data: {
            code: token,
            workspaceName: workspaceUser.workspace.name
          }
        })
      }

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
        ttl: t.Nullable(t.Number()),
        isEmail: t.Optional(t.Boolean())
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
        const lowerEmail = user.email.toLowerCase()
        const lowerUsername = user.username.toLowerCase()

        if (
          !invite.users.includes(lowerEmail) &&
          !invite.users.includes(lowerUsername)
        ) {
          return status(403, {
            message: "This invite is restricted to other users"
          })
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
