import { createHash } from "node:crypto"
import { and, eq } from "drizzle-orm"
import { db, sessions } from "../../database"

export function generateToken(): string {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  const token = Buffer.from(bytes).toString("hex")
  return createHash("sha256").update(token).digest("hex")
}

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, "argon2id")
}

export async function verifyPassword(
  stored: string,
  password: string
): Promise<boolean> {
  return Bun.password.verify(password, stored)
}

export async function createSession(
  sessionId: string,
  userId: string
): Promise<Session> {
  const session: Session = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
  }
  await db.insert(sessions).values({
    id: session.id,
    userId: session.userId,
    expiresAt: session.expiresAt
  })

  return session
}

export async function validateSessionToken(
  sessionId: string
): Promise<Session | null> {
  const sessionRow = await db.query.sessions.findFirst({
    where: (fields) => eq(fields.id, sessionId)
  })
  if (!sessionRow) {
    return null
  }

  const session: Session = {
    id: sessionRow.id,
    userId: sessionRow.userId,
    expiresAt: sessionRow.expiresAt
  }

  if (Date.now() >= session.expiresAt.getTime()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId))
    return null
  }
  if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
    session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    await db
      .update(sessions)
      .set({ expiresAt: session.expiresAt })
      .where(eq(sessions.id, session.id))
  }

  return session
}

export async function invalidateSession(
  sessionId: string,
  userId: string
): Promise<void> {
  await db
    .delete(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
}

export async function invalidateAllSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId))
}

export interface Session {
  id: string
  userId: string
  expiresAt: Date
}
