import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "./schema"

export function getDb(env: Env) {
	return drizzle(env.HYPERDRIVE.connectionString, { schema })
}

export * from "./schema"
