import { existsSync, mkdirSync } from "node:fs"
import path from "node:path"
import { Elysia, t } from "elysia"
import { db, workspaceFiles } from "../../database"
import authMiddleware from "../auth/auth.middleware"

const FILES_DIR = path.resolve(process.cwd(), "data/files")

if (!existsSync(FILES_DIR)) {
  mkdirSync(FILES_DIR, { recursive: true })
}

const filesController = new Elysia({
  name: "api.files",
  prefix: "/files"
})
  .use(authMiddleware)
  .get("/:hash", async ({ params: { hash }, set }) => {
    const filePath = path.join(FILES_DIR, hash)
    const file = Bun.file(filePath)

    if (!(await file.exists())) {
      set.status = 404
      return { message: "File not found" }
    }

    return file
  })
  .post(
    "/",
    async ({ body: { file, hash } }) => {
      const filePath = path.join(FILES_DIR, hash)

      if (!existsSync(filePath)) {
        await Bun.write(filePath, file)

        await db.insert(workspaceFiles).values({ hash }).onConflictDoNothing()
      }

      return { hash }
    },
    {
      body: t.Object({
        file: t.File(),
        hash: t.String()
      })
    }
  )

export default filesController
