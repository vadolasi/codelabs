import { asc, desc, eq } from "drizzle-orm"
import { v7 as randomUUIDv7 } from "uuid"
import { db } from "../database"
import { workspaceSnapshots, workspaceUpdates } from "../database/schema"

export async function saveSnapshot(
  workspaceId: string,
  data: Uint8Array
): Promise<string> {
  const id = randomUUIDv7()
  await db.transaction(async (tx) => {
    await tx.insert(workspaceSnapshots).values({
      id,
      workspaceId,
      snapshot: Buffer.from(data),
      createdAt: new Date()
    })
    await tx
      .delete(workspaceUpdates)
      .where(eq(workspaceUpdates.workspaceId, workspaceId))
  })
  return id
}

export async function getSnapshot(
  workspaceId: string
): Promise<Uint8Array | null> {
  const row = await db.query.workspaceSnapshots.findFirst({
    where: (ws) => eq(ws.workspaceId, workspaceId),
    orderBy: (ws) => desc(ws.createdAt)
  })
  if (!row) return null
  return Uint8Array.from(row.snapshot)
}

export async function deleteSnapshot(workspaceId: string): Promise<void> {
  await db
    .delete(workspaceSnapshots)
    .where(eq(workspaceSnapshots.workspaceId, workspaceId))
}

export async function clearWorkspaceUpdates(
  workspaceId: string
): Promise<void> {
  await db
    .delete(workspaceUpdates)
    .where(eq(workspaceUpdates.workspaceId, workspaceId))
}

export async function appendWorkspaceUpdate(
  workspaceId: string,
  update: Uint8Array
): Promise<void> {
  await db.insert(workspaceUpdates).values({
    id: randomUUIDv7(),
    workspaceId,
    update: Buffer.from(update),
    createdAt: new Date()
  })
}

export async function getWorkspaceUpdates(
  workspaceId: string
): Promise<Uint8Array[]> {
  const rows = await db
    .select()
    .from(workspaceUpdates)
    .where(eq(workspaceUpdates.workspaceId, workspaceId))
    .orderBy(asc(workspaceUpdates.createdAt))

  return rows.map((row) => Uint8Array.from(row.update))
}
