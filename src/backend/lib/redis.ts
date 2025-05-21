import Redis from "redis"

const redis = Redis.createClient({
	url: `redis://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:6379`
})
await redis.connect()

export default redis
