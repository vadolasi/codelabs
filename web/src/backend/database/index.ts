import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "./schema"

export function getDb(env: Env) {
	const db = drizzle(env.HYPERDRIVE.connectionString, { schema })

	return db
}

export * from "./schema"
