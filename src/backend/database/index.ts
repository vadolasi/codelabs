import { drizzle } from "drizzle-orm/bun-sql"
import type { RedisClientType } from "redis"
import redis from "../lib/redis"
import { nodeRedisCache } from "./cache"
import * as schema from "./schema"

const db = drizzle(
	`postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:5432/${process.env.POSTGRES_DB}`,
	{
		schema,
		cache: nodeRedisCache(redis as unknown as RedisClientType)
	}
)

export default db
export * from "./schema"
