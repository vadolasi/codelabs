import { drizzle } from "drizzle-orm/bun-sql"
import * as schema from "./schema"

const db = drizzle(
	`postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:5432/${process.env.POSTGRES_DB}`,
	{
		schema
	}
)

export default db
export * from "./schema"
