import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "sqlite",
  schema: "src/backend/database/schema.ts",
  dbCredentials: {
    url: "data/codelabs.db"
  }
})
