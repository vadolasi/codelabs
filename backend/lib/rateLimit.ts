import path from "node:path"
import Elysia from "elysia"
import { getRedisClient } from "./redis"

const redis = await getRedisClient()

const SCRIPT_SHA = await redis.scriptLoad(
	await Bun.file(path.join(import.meta.dirname, "rateLimit.lua")).text()
)

class TokenBucketRateLimit {
	private storageKey: string

	public max: number
	public refillIntervalSeconds: number

	constructor(storageKey: string, max: number, refillIntervalSeconds: number) {
		this.storageKey = storageKey
		this.max = max
		this.refillIntervalSeconds = refillIntervalSeconds
	}

	public async consume(key: string, cost: number): Promise<boolean> {
		const result = await redis.EVALSHA(SCRIPT_SHA, {
			keys: [`${this.storageKey}:${key}`],
			arguments: [
				this.max.toString(),
				this.refillIntervalSeconds.toString(),
				cost.toString(),
				Math.floor(Date.now() / 1000).toString()
			]
		})
		if (Array.isArray(result)) {
			return Boolean(result[0])
		}
		return Boolean(result)
	}
}

const rateLimiters = {
	high: new TokenBucketRateLimit("rate_limit:high", 10, 60 * 60),
	medium: new TokenBucketRateLimit("rate_limit:medium", 10, 60),
	low: new TokenBucketRateLimit("rate_limit:low", 100, 60)
}

const rateLimitMiddleware = new Elysia().macro({
	rateLimitByIP: (level: "low" | "medium" | "high") => ({
		beforeHandle: async ({ request }) => {
			const identifier =
				rateLimitMiddleware.server?.requestIP(request)?.address ??
				request.headers.get("x-forwarded-for") ??
				"guest"

			const rateLimiter = rateLimiters[level]

			const valid = await rateLimiter.consume(identifier, 1)

			if (!valid) {
				return new Response("Rate limit exceeded", {
					status: 429,
					headers: {
						"Retry-After": rateLimiter.refillIntervalSeconds.toString()
					}
				})
			}
		}
	})
})

export default rateLimitMiddleware
