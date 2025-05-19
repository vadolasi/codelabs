const redis = new Bun.RedisClient(
	`redis://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:6379`
)

export default redis
