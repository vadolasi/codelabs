import Redis, { RESP_TYPES } from "redis"
import config from "./config"

const redis = Redis.createClient({
	url: config.REDIS_URL
}).withTypeMapping({
	[RESP_TYPES.BLOB_STRING]: Buffer
})

export default redis
