import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

config({
	path: "../.env"
})

console.log(process.env.POSTGRES_URL!)

export default defineConfig({
	dialect: "postgresql",
	schema: "src/backend/database/schema.ts",
	dbCredentials: {
		url: process.env.POSTGRES_URL!
	}
})
