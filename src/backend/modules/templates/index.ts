import { randomUUIDv7 } from "bun"
import { eq } from "drizzle-orm"
import Elysia, { t } from "elysia"
import { nanoid } from "nanoid"
import {
  db,
  workspaces,
  workspaces__users,
  workspaceTemplates
} from "../../database"
import { saveSnapshot } from "../../lib/storage"
import authMiddleware from "../auth/auth.middleware"

const templatesController = new Elysia({
  name: "api.templates",
  prefix: "/templates"
})
  .use(authMiddleware)
  .get("/:id", async ({ params: { id }, status }) => {
    const template = await db.query.workspaceTemplates.findFirst({
      where: eq(workspaceTemplates.id, id),
      columns: {
        id: true,
        name: true,
        createdAt: true
      }
    })

    if (!template) {
      return status(404, { message: "Template not found" })
    }

    return template
  })
  .post(
    "/:id/fork",
    async ({ params: { id }, body: { name }, userId, status }) => {
      const template = await db.query.workspaceTemplates.findFirst({
        where: eq(workspaceTemplates.id, id),
        columns: {
          name: true,
          engine: true,
          config: true,
          snapshot: true
        }
      })

      if (!template) {
        return status(404, { message: "Template not found" })
      }

      const newId = randomUUIDv7()
      const newName = name || `${template.name} (fork)`

      console.log(
        `[Template Fork] Criando workspace do template ${id}. Engine: ${template.engine}`
      )

      const [data] = await db
        .insert(workspaces)
        .values({
          id: newId,
          name: newName,
          engine: template.engine,
          config: template.config as any,
          slug: `${newName.toLowerCase().replace(/\s+/g, "-")}-${nanoid(8)}`
        })
        .returning()

      if (!data) {
        return status(500, {
          message: "Failed to create workspace from template"
        })
      }

      await saveSnapshot(newId, new Uint8Array(template.snapshot))

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

export default templatesController
