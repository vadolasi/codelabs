import Redis, { RESP_TYPES } from "redis"
import { Resource } from "sst"

const redis = Redis.createClient({
	url: `${process.env.NODE_ENV === "production" ? "rediss" : "redis"}://${Resource.CodelabsRedis.username}:${Resource.CodelabsRedis.password}@${Resource.CodelabsRedis.host}:${Resource.CodelabsRedis.port}`,
	unstableResp3: true
}).withTypeMapping({
	[RESP_TYPES.BLOB_STRING]: Buffer
})
await redis.connect()

export default redis
