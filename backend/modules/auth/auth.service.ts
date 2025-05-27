import {
	encodeBase32LowerCaseNoPadding,
	encodeHexLowerCase
} from "@oslojs/encoding"
import redis from "../../lib/redis"

export function generateSessionToken(): string {
	const bytes = new Uint8Array(20)
	crypto.getRandomValues(bytes)
	const token = encodeBase32LowerCaseNoPadding(bytes)
	return token
}

export async function createSession(
	token: string,
	userId: string
): Promise<Session> {
	const sessionId = encodeHexLowerCase(
		new Bun.CryptoHasher("sha256").update(token).digest()
	)
	const session: Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
	}
	await redis.set(
		`session:${session.id}`,
		JSON.stringify({
			id: session.id,
			user_id: session.userId,
			expires_at: Math.floor(session.expiresAt.getTime() / 1000)
		}),
		{
			EXAT: Math.floor(session.expiresAt.getTime() / 1000)
		}
	)
	await redis.sAdd(`user_sessions:${userId}`, sessionId)

	return session
}

export async function validateSessionToken(
	token: string
): Promise<Session | null> {
	const sessionId = encodeHexLowerCase(
		new Bun.CryptoHasher("sha256").update(token).digest()
	)
	const item = await redis.get(`session:${sessionId}`)
	if (item === null) {
		return null
	}

	const result = JSON.parse(item.toString("utf-8"))
	const session: Session = {
		id: result.id,
		userId: result.user_id,
		expiresAt: new Date(result.expires_at * 1000)
	}

	if (Date.now() >= session.expiresAt.getTime()) {
		await redis.del(`session:${sessionId}`)
		await redis.sRem(`user_sessions:${session.userId}`, sessionId)
		return null
	}
	if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
		session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
		await redis.set(
			`session:${session.id}`,
			JSON.stringify({
				id: session.id,
				user_id: session.userId,
				expires_at: Math.floor(session.expiresAt.getTime() / 1000)
			}),
			{
				expiration: {
					type: "EXAT",
					value: Math.floor(session.expiresAt.getTime() / 1000)
				}
			}
		)
	}
	return session
}

export async function invalidateSession(
	sessionId: string,
	userId: number
): Promise<void> {
	await redis.del(`session:${sessionId}`)
	await redis.sRem(`user_sessions:${userId}`, sessionId)
}

export async function invalidateAllSessions(userId: number): Promise<void> {
	const sessionIdsRaw = await redis.sMembers(`user_sessions:${userId}`)
	const sessionIds = Array.isArray(sessionIdsRaw) ? sessionIdsRaw : []
	if (sessionIds.length < 1) {
		return
	}

	const pipeline = redis.multi()

	for (const sessionId of sessionIds) {
		pipeline.unlink(`session:${sessionId}`)
	}
	pipeline.unlink(`user_sessions:${userId}`)

	await pipeline.execAsPipeline()
}

export interface Session {
	id: string
	userId: string
	expiresAt: Date
}
