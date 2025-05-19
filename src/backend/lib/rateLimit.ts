import Elysia from "elysia"
import redis from "./redis"

const SCRIPT_SHA = await redis.send("SCRIPT LOAD", [
	await Bun.file(import.meta.resolve("./rateLimit.lua")).text()
])

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
		const result = await redis.send("EVALSHA", [
			SCRIPT_SHA,
			{
				keys: [`${this.storageKey}:${key}`],
				arguments: [
					this.max.toString(),
					this.refillIntervalSeconds.toString(),
					cost.toString(),
					Math.floor(Date.now() / 1000).toString()
				]
			}
		])
		return Boolean(result[0])
	}
}

const rateLimit = new TokenBucketRateLimit("rate_limit", 10, 1)

const rateLimitMiddleware = new Elysia().guard({
	beforeHandle: async ({ cookie }) => {}
})

export default rateLimitMiddleware
