import Redis, { RESP_TYPES } from "redis"

const redis = Redis.createClient({
	url: `redis://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:6379`,
	unstableResp3: true
}).withTypeMapping({
	[RESP_TYPES.BLOB_STRING]: Buffer
})
await redis.connect()

export default redis
