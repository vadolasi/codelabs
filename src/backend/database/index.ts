import { Database } from "bun:sqlite"
import { mkdirSync } from "node:fs"
import path from "node:path"
import { randomUUIDv7 } from "bun"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import * as schema from "./schema"

const dbPath = path.resolve(process.cwd(), "data/codelabs.db")

try {
  mkdirSync(path.dirname(dbPath), { recursive: true })
} catch (e) {
  console.error("Failed to create data directory:", e)
}

console.log(`Connecting to database at: ${dbPath}`)
const sqlite = new Database(dbPath)
export const db = drizzle(sqlite, { schema })

if (
  process.env.NODE_ENV === "production" &&
  process.env.VITE_BUILD !== "true"
) {
  try {
    const migrationsPath = path.resolve(process.cwd(), "drizzle")
    migrate(db, { migrationsFolder: migrationsPath })
    const firstUser = await db.query.users.findFirst({
      where: ({ username }, { eq }) => eq(username, "#admin")
    })
    if (!firstUser) {
      const password = randomUUIDv7().slice(0, 8)
      await db.insert(schema.users).values({
        id: randomUUIDv7(),
        email: "codelabsadmin@vitordaniel.is-a.dev",
        username: "#admin",
        password,
        emailVerified: true,
        role: "admin"
      })
      console.log(
        `Admin user created with username '#admin' and password '${password}'`
      )
    }
  } catch (error) {
    console.error("CRITICAL: Migration failed:", error)
  }
}

export * from "./schema"
