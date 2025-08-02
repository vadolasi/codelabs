import { drizzle } from "drizzle-orm/bun-sql"
import { Resource } from "sst"
import * as schema from "./schema"

const connectionString = `postgres://${Resource.CodelabsDatabase.username}:${Resource.CodelabsDatabase.password}@${Resource.CodelabsDatabase.host}:${Resource.CodelabsDatabase.port}/${Resource.CodelabsDatabase.database}`

const db = drizzle(connectionString, {
	schema
})

export default db
export * from "./schema"
