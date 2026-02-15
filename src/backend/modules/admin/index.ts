import { hitlimit } from "@joint-ops/hitlimit-bun/elysia"
import { memoryStore } from "@joint-ops/hitlimit-bun/stores/memory"
import { count } from "drizzle-orm"
import Elysia from "elysia"
import { db, users, workspaces } from "../../database"
import authMiddleware from "../auth/auth.middleware"

const adminController = new Elysia({
  name: "api.admin",
  prefix: "/admin"
})
  .use(authMiddleware)
  .use(hitlimit({ limit: 100, window: "1m", store: memoryStore() }))
  .get(
    "/stats",
    async () => {
      const [
        [{ count: totalUsers }],
        [{ count: totalWorkspaces }],
        recentUsers
      ] = await Promise.all([
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(workspaces),
        db.query.users.findMany({
          columns: {
            id: true,
            email: true,
            username: true,
            createdAt: true
          },
          orderBy: (users, { desc }) => desc(users.createdAt),
          limit: 5
        })
      ])

      return {
        totalUsers,
        totalWorkspaces,
        recentUsers
      }
    },
    {
      user: "admin"
    }
  )
  .get(
    "/users",
    async () => {
      const users = await db.query.users.findMany({
        columns: {
          id: true,
          email: true,
          username: true,
          role: true,
          createdAt: true
        },
        orderBy: (users, { desc }) => desc(users.createdAt)
      })

      return users
    },
    {
      user: "admin"
    }
  )

export default adminController
