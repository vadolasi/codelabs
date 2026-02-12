import { join } from "node:path"

const STORAGE_DIR = "data/snapshots"

export async function readSnapshotMeta(
  workspaceId: string
): Promise<{ createdAt: string } | null> {
  const metaPath = join(STORAGE_DIR, `${workspaceId}.meta.json`)
  const file = Bun.file(metaPath)
  if (!(await file.exists())) return null
  try {
    const text = await file.text()
    return JSON.parse(text)
  } catch (e) {
    console.warn(`[readSnapshotMeta] Erro ao ler meta do snapshot:`, e)
    return null
  }
}
