import { randomUUIDv7 } from "bun"
import { asc, eq } from "drizzle-orm"
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
  workspaceId: string,
  tx = db
): Promise<Uint8Array | null> {
  // @ts-expect-error: tx.query is available on both db and transaction
  const row = await tx.query.workspaceSnapshots.findFirst({
    where: (ws, { eq }) => eq(ws.workspaceId, workspaceId),
    orderBy: (ws, { desc }) => desc(ws.createdAt)
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
  workspaceId: string,
  tx = db
): Promise<Uint8Array[]> {
  const rows = await tx
    .select()
    .from(workspaceUpdates)
    .where(eq(workspaceUpdates.workspaceId, workspaceId))
    .orderBy(asc(workspaceUpdates.createdAt))

  return rows.map((row) => Uint8Array.from(row.update))
}
