import { Database } from "bun:sqlite"
import { mkdirSync } from "node:fs"
import path from "node:path"
import { randomUUIDv7 } from "bun"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import config from "../lib/config"
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

if (!config.BUILD && config.NODE_ENV === "production") {
  try {
    const migrationsPath = path.resolve(process.cwd(), "drizzle")
    console.log(`Running migrations from: ${migrationsPath}`)
    migrate(db, { migrationsFolder: migrationsPath })

    const passwordHash = await Bun.password.hash(config.ADMIN_PASSWORD)

    await db.insert(schema.users).values({
      id: randomUUIDv7(),
      email: config.ADMIN_EMAIL,
      username: "#admin",
      password: passwordHash,
      emailVerified: true,
      role: "admin"
    })
      .onConflictDoUpdate({
        target: schema.users.email,
        set: {
          email: config.ADMIN_EMAIL,
          password: passwordHash
        }
      })

    console.log(
      `Admin user upserted with username '#admin', email '${config.ADMIN_EMAIL}' and password '${config.ADMIN_PASSWORD.slice(0, 4)}${"*".repeat(config.ADMIN_PASSWORD.length - 4)}'`
    )
  } catch (error) {
    console.error("CRITICAL: Database initialization failed:", error)
  }
} else {
  console.log("Skipping database initialization (build detected)")
}

export * from "./schema"
