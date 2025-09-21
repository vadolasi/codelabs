import { Pool, neonConfig } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-serverless"
import { WebSocket } from "ws"
import config from "../lib/config"
import * as schema from "./schema"

if (config.NODE_ENV === "production") {
	neonConfig.webSocketConstructor = WebSocket
	neonConfig.poolQueryViaFetch = true
} else {
	neonConfig.wsProxy = (host) => `${host}:5433/v1`
	neonConfig.useSecureWebSocket = false
	neonConfig.pipelineTLS = false
	neonConfig.pipelineConnect = false
}

const pool = new Pool({ connectionString: config.POSTGRES_URL })

const db = drizzle(pool, { schema })

export default db
export * from "./schema"
