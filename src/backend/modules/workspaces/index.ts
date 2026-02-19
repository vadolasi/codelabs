import { randomUUIDv7 } from "bun"
import { and, eq, inArray, or } from "drizzle-orm"
import Elysia, { t } from "elysia"
import { nanoid } from "nanoid"
import {
  db,
  users,
  workspaceInvite,
  workspaces,
  workspaces__users,
  workspaceTemplates
} from "../../database"
import sendEmail from "../../emails"
import {
  getCleanSnapshot,
  getMergedSnapshot,
  getSnapshot,
  getWorkspaceUpdates,
  saveSnapshot
} from "../../lib/storage"
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
  .get("/id/:id/members", async ({ params: { id }, userId, status }) => {
    const workspaceUser = await db.query.workspaces__users.findFirst({
      where: and(
        eq(workspaces__users.userId, userId),
        eq(workspaces__users.workspaceId, id)
      ),
      columns: { role: true }
    })

    if (!workspaceUser) {
      return status(404, { message: "Workspace not found" })
    }

    const members = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: workspaces__users.role
      })
      .from(workspaces__users)
      .innerJoin(users, eq(workspaces__users.userId, users.id))
      .where(eq(workspaces__users.workspaceId, id))

    return members
  })
  .delete(
    "/id/:id/members/:targetUserId",
    async ({ params: { id, targetUserId }, userId, status }) => {
      const workspaceUser = await db.query.workspaces__users.findFirst({
        where: and(
          eq(workspaces__users.userId, userId),
          eq(workspaces__users.workspaceId, id)
        ),
        columns: { role: true }
      })

      if (!workspaceUser || workspaceUser.role !== "owner") {
        return status(403, { message: "Only owners can remove members" })
      }

      if (userId === targetUserId) {
        return status(400, { message: "Owners cannot remove themselves" })
      }

      await db
        .delete(workspaces__users)
        .where(
          and(
            eq(workspaces__users.userId, targetUserId),
            eq(workspaces__users.workspaceId, id)
          )
        )

      return { success: true }
    }
  )
  .post(
    "/id/:id/members",
    async ({ params: { id }, body: { email, role }, userId, status }) => {
      const workspaceUser = await db.query.workspaces__users.findFirst({
        where: and(
          eq(workspaces__users.userId, userId),
          eq(workspaces__users.workspaceId, id)
        ),
        columns: { role: true },
        with: { workspace: { columns: { name: true } } }
      })

      if (!workspaceUser || !["owner", "admin"].includes(workspaceUser.role)) {
        return status(403, { message: "Only owners or admins can add members" })
      }

      const formattedEmail = email.toLowerCase().trim()

      // 1. Try to find the user in the database
      const targetUser = await db.query.users.findFirst({
        where: eq(users.email, formattedEmail),
        columns: { id: true, username: true }
      })

      if (targetUser) {
        // 2. User exists, check if already a member
        const alreadyMember = await db.query.workspaces__users.findFirst({
          where: and(
            eq(workspaces__users.userId, targetUser.id),
            eq(workspaces__users.workspaceId, id)
          ),
          columns: { id: true }
        })

        if (alreadyMember) {
          return status(400, { message: "User is already a member" })
        }

        // 3. Add directly as member
        await db.insert(workspaces__users).values({
          id: randomUUIDv7(),
          userId: targetUser.id,
          workspaceId: id,
          role
        })

        // 4. Send notification email
        await sendEmail("workspaceInvite", {
          subject: `Você foi adicionado ao workspace ${workspaceUser.workspace.name}`,
          to: [formattedEmail],
          data: {
            code: "", // Not used for direct add, but template might need it
            workspaceName: workspaceUser.workspace.name,
            isDirectAdd: true // We should update email template to handle this
          }
        })
      } else {
        // 5. User doesn't exist, create a restricted invitation
        const token = nanoid(10)
        await db.insert(workspaceInvite).values({
          id: randomUUIDv7(),
          workspaceId: id,
          role,
          users: [formattedEmail],
          token,
          expiresAt: new Date(Date.now() + 3600 * 24 * 7 * 1000) // 1 week
        })

        // 6. Send invitation email
        await sendEmail("workspaceInvite", {
          subject: `Convite para o workspace ${workspaceUser.workspace.name}`,
          to: [formattedEmail],
          data: {
            code: token,
            workspaceName: workspaceUser.workspace.name
          }
        })
      }

      return { success: true }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        role: t.Union([t.Literal("editor"), t.Literal("viewer")])
      })
    }
  )
  .get("/:slug", async ({ params: { slug }, userId, status, headers }) => {
    if (headers.accept !== "application/x-msgpack") {
      return status(400, {
        message: "Client must accept application/x-msgpack"
      })
    }

    // 1. First find the workspace by slug
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.slug, slug),
      columns: {
        id: true,
        name: true,
        engine: true,
        updatedAt: true,
        visibility: true
      }
    })

    if (!workspace) {
      return status(404, { message: "Workspace not found" })
    }

    // 2. Check if the user is a member
    const membership = await db.query.workspaces__users.findFirst({
      where: and(
        eq(workspaces__users.userId, userId),
        eq(workspaces__users.workspaceId, workspace.id)
      ),
      columns: {
        role: true
      }
    })

    // 3. Deny access if private and not a member
    if (!membership && workspace.visibility === "private") {
      return status(403, { message: "This workspace is private" })
    }

    // 4. Update last access if they ARE a member
    if (membership) {
      await db
        .update(workspaces__users)
        .set({ lastAccessedAt: new Date() })
        .where(
          and(
            eq(workspaces__users.userId, userId),
            eq(workspaces__users.workspaceId, workspace.id)
          )
        )
    }

    const snapshot = await getSnapshot(workspace.id)
    const updates = await getWorkspaceUpdates(workspace.id)

    return {
      workspace: {
        ...workspace,
        role: membership?.role ?? "viewer" // Non-members get "viewer" role in public workspaces
      },
      doc: snapshot,
      updates
    }
  })
  .post(
    "/id/:id/fork",
    async ({ params: { id }, body: { name }, userId, status }) => {
      const sourceWorkspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, id),
        columns: {
          name: true,
          engine: true,
          config: true,
          visibility: true
        }
      })

      if (!sourceWorkspace) {
        return status(404, { message: "Workspace not found" })
      }

      // Check access
      const membership = await db.query.workspaces__users.findFirst({
        where: and(
          eq(workspaces__users.userId, userId),
          eq(workspaces__users.workspaceId, id)
        )
      })

      if (!membership && sourceWorkspace.visibility !== "public") {
        return status(403, { message: "Unauthorized" })
      }

      const mergedSnapshot = await getMergedSnapshot(id)
      if (!mergedSnapshot) {
        return status(500, { message: "Failed to merge workspace state" })
      }

      const newId = randomUUIDv7()
      const newName = name || `${sourceWorkspace.name} (fork)`

      console.log(
        `[Fork] Copiando engine: ${sourceWorkspace.engine} de ${id} para ${newId}`
      )

      const [data] = await db
        .insert(workspaces)
        .values({
          id: newId,
          name: newName,
          engine: sourceWorkspace.engine,
          config: sourceWorkspace.config,
          slug: `${newName.toLowerCase().replace(/\s+/g, "-")}-${nanoid(8)}`
        })
        .returning()

      if (!data) {
        return status(500, { message: "Failed to create forked workspace" })
      }

      await saveSnapshot(newId, mergedSnapshot)

      await db.insert(workspaces__users).values({
        id: randomUUIDv7(),
        userId,
        workspaceId: newId,
        role: "owner"
      })

      return data
    },
    {
      body: t.Object({
        name: t.Optional(t.String())
      })
    }
  )
  .patch(
    "/id/:id",
    async ({ params: { id }, body: { visibility }, userId, status }) => {
      const workspaceUser = await db.query.workspaces__users.findFirst({
        where: and(
          eq(workspaces__users.userId, userId),
          eq(workspaces__users.workspaceId, id)
        ),
        columns: { role: true }
      })

      if (!workspaceUser || workspaceUser.role !== "owner") {
        return status(403, {
          message: "Only owners can change workspace settings"
        })
      }

      await db
        .update(workspaces)
        .set({ visibility })
        .where(eq(workspaces.id, id))

      return { success: true }
    },
    {
      body: t.Object({
        visibility: t.Union([t.Literal("private"), t.Literal("public")])
      })
    }
  )
  .post("/id/:id/template", async ({ params: { id }, userId, status }) => {
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, id),
      columns: {
        name: true,
        engine: true,
        config: true
      }
    })

    if (!workspace) {
      return status(404, { message: "Workspace not found" })
    }

    // Only owner can create template
    const membership = await db.query.workspaces__users.findFirst({
      where: and(
        eq(workspaces__users.userId, userId),
        eq(workspaces__users.workspaceId, id),
        eq(workspaces__users.role, "owner")
      )
    })

    if (!membership) {
      return status(403, { message: "Only owners can create templates" })
    }

    const cleanSnapshot = await getCleanSnapshot(id)
    if (!cleanSnapshot) {
      return status(500, { message: "Failed to generate clean snapshot" })
    }

    const templateId = randomUUIDv7()
    await db.insert(workspaceTemplates).values({
      id: templateId,
      name: workspace.name,
      engine: workspace.engine,
      snapshot: Buffer.from(cleanSnapshot),
      config: workspace.config
    })

    return { id: templateId }
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
      body: { users, role, workspaceId, ttl, isEmail, forceNew },
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

      // Reusable token logic for links (when no specific users are provided)
      if (!users || users.length === 0) {
        const existingInvite = await db.query.workspaceInvite.findFirst({
          where: and(
            eq(workspaceInvite.workspaceId, workspaceId),
            eq(workspaceInvite.role, role),
            // Only reusable if users is null
            // @ts-expect-error
            eq(workspaceInvite.users, null)
          )
        })

        if (existingInvite && !forceNew) {
          return existingInvite.token
        }

        if (existingInvite && forceNew) {
          await db
            .delete(workspaceInvite)
            .where(eq(workspaceInvite.id, existingInvite.id))
        }
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
        isEmail: t.Optional(t.Boolean()),
        forceNew: t.Optional(t.Boolean())
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
