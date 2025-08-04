import Redis, { RESP_TYPES } from "redis"
import { Resource } from "sst"

let redisClient: ReturnType<
	ReturnType<typeof Redis.createClient>["withTypeMapping"]
>

export async function getRedisClient() {
	if (redisClient?.isOpen) {
		return redisClient
	}

	redisClient = Redis.createClient({
		url: `${process.env.NODE_ENV === "production" ? "rediss" : "redis"}://${Resource.CodelabsRedis.username}:${encodeURIComponent(Resource.CodelabsRedis.password)}@${Resource.CodelabsRedis.host}:${Resource.CodelabsRedis.port}`
	}).withTypeMapping({
		[RESP_TYPES.BLOB_STRING]: Buffer
	})

	await redisClient.connect()

	return redisClient
}
