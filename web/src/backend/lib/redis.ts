import { building } from "$app/environment"
import Redis, { RESP_TYPES } from "redis"
import config from "./config"

const redis = Redis.createClient({
	url: config.REDIS_URL,
	unstableResp3: true
}).withTypeMapping({
	[RESP_TYPES.BLOB_STRING]: Buffer
})

if (!building) {
	await redis.connect()
}

export default redis
