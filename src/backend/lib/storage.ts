import { randomUUIDv7 } from "bun"
import { asc, eq } from "drizzle-orm"
import { LoroDoc, LoroList, LoroMap, LoroText } from "loro-crdt"
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

export async function getMergedSnapshot(
  workspaceId: string,
  tx = db
): Promise<Uint8Array | null> {
  const snapshot = await getSnapshot(workspaceId, tx)
  const updates = await getWorkspaceUpdates(workspaceId, tx)

  if (!snapshot && updates.length === 0) return null

  const doc = new LoroDoc()
  if (snapshot) doc.import(snapshot)
  if (updates.length > 0) doc.importBatch(updates)

  return doc.export({ mode: "snapshot" })
}

export async function getCleanSnapshot(
  workspaceId: string,
  tx = db
): Promise<Uint8Array | null> {
  const mergedSnapshot = await getMergedSnapshot(workspaceId, tx)
  if (!mergedSnapshot) return null

  const sourceDoc = new LoroDoc()
  sourceDoc.import(mergedSnapshot)

  const cleanDoc = new LoroDoc()
  const sourceFiles = sourceDoc.getMap("files")
  const cleanFiles = cleanDoc.getMap("files")

  // Reconstruct the files map to clear history
  for (const [path, item] of Object.entries(sourceFiles.toJSON())) {
    const itemMap = cleanFiles.setContainer(path, new LoroMap())

    // Copy data
    if (item.data) {
      itemMap.set("data", item.data)
    }

    // Copy children if exists
    if (item.children) {
      const cleanChildren = itemMap.setContainer("children", new LoroList())
      for (const child of item.children) {
        cleanChildren.push(child)
      }
    }

    // Copy editableContent if exists
    if (item.editableContent) {
      const cleanText = itemMap.setContainer("editableContent", new LoroText())
      cleanText.insert(0, item.editableContent)
    }
  }

  return cleanDoc.export({ mode: "snapshot" })
}
