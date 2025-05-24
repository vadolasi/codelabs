import { Table, getTableName, is } from "drizzle-orm"
import { Cache, type MutationOption } from "drizzle-orm/cache/core"
import type { CacheConfig } from "drizzle-orm/cache/core/types"
import type { RedisClientType } from "redis"

const DEFAULT_TTL_MS = 3600 * 1000
const CACHE_ENTRY_PREFIX = "drizzle:cache:"
const TABLE_TO_KEYS_PREFIX = "drizzle:tbl_keys:"
const TAG_TO_KEYS_PREFIX = "drizzle:tag_keys:"

export class NodeRedisCache extends Cache {
	private globalTtlMs: number
	private cacheStrategy: "explicit" | "all"

	constructor(
		private redisClient: RedisClientType,
		config: {
			globalTtlMs?: number
			strategy?: "explicit" | "all"
		} = {}
	) {
		super()
		this.globalTtlMs = config.globalTtlMs ?? DEFAULT_TTL_MS
		this.cacheStrategy = config.strategy ?? "explicit"
	}

	strategy() {
		return this.cacheStrategy
	}

	async get(
		key: string,
		tables: string[],
		isTag = false,
		isAutoInvalidate?: boolean
	): Promise<never[] | undefined> {
		try {
			const redisKey = `${CACHE_ENTRY_PREFIX}${key}`
			const value = await this.redisClient.get(redisKey)
			if (value === null) {
				return undefined
			}
			return JSON.parse(value) as never[]
		} catch (error) {
			console.error(`Error getting key ${key} from Redis:`, error)
			return undefined
		}
	}

	async put(
		hashedQuery: string,
		response: never,
		tables: string[],
		isTag: boolean,
		config?: CacheConfig
	): Promise<void> {
		try {
			const redisKey = `${CACHE_ENTRY_PREFIX}${hashedQuery}`
			const ttlMs = config?.ex ?? this.globalTtlMs
			const serializedResponse = JSON.stringify(response)

			const multi = this.redisClient.multi()
			multi.set(redisKey, serializedResponse, { PX: ttlMs })

			for (const table of tables) {
				const tableName = is(table, Table)
					? getTableName(table as Table)
					: table
				multi.sAdd(`${TABLE_TO_KEYS_PREFIX}${tableName}`, hashedQuery)
			}
			await multi.exec()
		} catch (error) {
			console.error(
				`Error putting key ${hashedQuery} (isTag: ${isTag}) to Redis:`,
				error
			)
		}
	}

	async onMutate(params: MutationOption): Promise<void> {
		try {
			const keysToDelete = new Set<string>()
			const tableNames: string[] = []
			const tagsToInvalidate: string[] = []

			if (params.tables) {
				const rawTables = Array.isArray(params.tables)
					? params.tables
					: [params.tables]
				for (const table of rawTables) {
					tableNames.push(
						is(table, Table) ? getTableName(table as Table) : (table as string)
					)
				}
			}

			if (params.tags) {
				const rawTags = Array.isArray(params.tags) ? params.tags : [params.tags]
				tagsToInvalidate.push(...rawTags)
			}

			const multi = this.redisClient.multi()
			let operationsAdded = false

			for (const tableName of tableNames) {
				const tableKeySetRedisKey = `${TABLE_TO_KEYS_PREFIX}${tableName}`
				const keysFromTable =
					await this.redisClient.sMembers(tableKeySetRedisKey)
				if (keysFromTable.length > 0 || tableNames.length > 0) {
					operationsAdded = true
				}
				for (const k of keysFromTable) {
					keysToDelete.add(k)
				}
				multi.del(tableKeySetRedisKey)
			}

			for (const tag of tagsToInvalidate) {
				const tagKeySetRedisKey = `${TAG_TO_KEYS_PREFIX}${tag}`
				const keysFromTag = await this.redisClient.sMembers(tagKeySetRedisKey)
				if (keysFromTag.length > 0 || tagsToInvalidate.length > 0) {
					operationsAdded = true
				}
				for (const k of keysFromTag) {
					keysToDelete.add(k)
				}
				multi.del(tagKeySetRedisKey)
				keysToDelete.add(tag)
			}

			if (keysToDelete.size > 0) {
				operationsAdded = true
				const redisKeysToDelete: string[] = []
				for (const k of keysToDelete) {
					redisKeysToDelete.push(`${CACHE_ENTRY_PREFIX}${k}`)
				}
				if (redisKeysToDelete.length > 0) {
					multi.del(redisKeysToDelete)
				}
			}

			if (operationsAdded) {
				await multi.exec()
			}
		} catch (error) {
			console.error("Error during onMutate:", error)
		}
	}
}

export function nodeRedisCache(
	redisClient: RedisClientType,
	config: {
		globalTtlMs?: number
		strategy?: "explicit" | "all"
	} = {}
): NodeRedisCache {
	return new NodeRedisCache(redisClient, config)
}
