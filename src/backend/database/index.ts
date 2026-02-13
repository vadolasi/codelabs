import { Database } from "bun:sqlite"
import { mkdirSync } from "node:fs"
import path from "node:path"
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

if (process.env.NODE_ENV === "production" && process.env.VITE_BUILD !== "true") {
  try {
    const migrationsPath = path.resolve(process.cwd(), "drizzle")
    migrate(db, { migrationsFolder: migrationsPath })
  } catch (error) {
    console.error("CRITICAL: Migration failed:", error)
  }
}

export * from "./schema"
