import { randomUUIDv7 } from "bun"
import { asc, eq } from "drizzle-orm"
import { LoroDoc, LoroList, LoroMap, LoroText } from "loro-crdt"
import { db } from "../database"
import { workspaces, workspaceUpdates } from "../database/schema"

export async function saveSnapshot(
  workspaceId: string,
  data: Uint8Array
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(workspaces)
      .set({
        snapshot: Buffer.from(data),
        updatedAt: new Date()
      })
      .where(eq(workspaces.id, workspaceId))

    await tx
      .delete(workspaceUpdates)
      .where(eq(workspaceUpdates.workspaceId, workspaceId))
  })
}

export async function getSnapshot(
  workspaceId: string,
  tx = db
): Promise<Uint8Array | null> {
  // @ts-expect-error: tx.query is available on both db and transaction
  const row = await tx.query.workspaces.findFirst({
    where: (ws, { eq }) => eq(ws.id, workspaceId),
    columns: {
      snapshot: true
    }
  })
  if (!row?.snapshot) return null
  return Uint8Array.from(row.snapshot)
}

export async function deleteSnapshot(workspaceId: string): Promise<void> {
  await db
    .update(workspaces)
    .set({ snapshot: null })
    .where(eq(workspaces.id, workspaceId))
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
    .orderBy(asc(workspaceUpdates.id)) // Use ID (UUIDv7) for perfect chronological order

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

    // 1. Determine the latest content (prefer live editable content over saved content)
    let finalContent = item.data?.content || ""
    if (item.editableContent && typeof item.editableContent === "string") {
      finalContent = item.editableContent
    }

    // 2. Copy data, ensuring content is synchronized with the live version
    if (item.data) {
      const data = { ...item.data }
      if (data.type === "file") {
        data.content = finalContent
      }
      itemMap.set("data", data)
    }

    // 3. Copy children if exists
    if (item.children) {
      const cleanChildren = itemMap.setContainer("children", new LoroList())
      for (const child of item.children) {
        cleanChildren.push(child)
      }
    }

    // 4. Copy editableContent if exists
    if (item.editableContent) {
      const cleanText = itemMap.setContainer("editableContent", new LoroText())
      cleanText.insert(0, finalContent)
    }
  }

  return cleanDoc.export({ mode: "snapshot" })
}
