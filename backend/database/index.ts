import { drizzle } from "drizzle-orm/bun-sql"
import config from "../lib/config"
import * as schema from "./schema"

const db = drizzle(config.POSTGRES_URL, { schema })

export default db
export * from "./schema"
