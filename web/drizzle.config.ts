import { defineConfig } from "drizzle-kit"

export default defineConfig({
	dialect: "postgresql",
	schema: "src/backend/database/schema.ts",
	dbCredentials: {
		url: "postgresql://postgres:postgres@localhost:5432/codelabs"
	}
})
