import { defineConfig } from "drizzle-kit"

export default defineConfig({
	dialect: "postgresql",
	schema: "database/schema.ts",
	dbCredentials: {
		url:
			process.env.POSTGRES_URL ??
			"postgres://codelabs:codelabs@localhost:5432/codelabs"
	}
})
