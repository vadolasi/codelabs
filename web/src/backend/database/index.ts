import { drizzle } from "drizzle-orm/node-postgres"
import config from "../lib/config"
import * as schema from "./schema"

const db = drizzle(config.POSTGRES_URL, { schema })

export default db
export * from "./schema"
