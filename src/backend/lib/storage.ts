import { mkdir } from "node:fs/promises"
import { join } from "node:path"

const STORAGE_DIR = "data/snapshots"
const UPDATES_DIR = "data/updates"

// Garante que o diretório existe
await mkdir(STORAGE_DIR, { recursive: true })
await mkdir(UPDATES_DIR, { recursive: true })

export async function saveSnapshot(
  workspaceId: string,
  data: Uint8Array
): Promise<string> {
  const filename = `${workspaceId}.snapshot`
  const filepath = join(STORAGE_DIR, filename)

  await Bun.write(filepath, data)

  return filename
}

export async function getSnapshot(workspaceId: string): Promise<Uint8Array> {
  const filepath = join(STORAGE_DIR, `${workspaceId}.snapshot`)
  const file = Bun.file(filepath)

  if (!(await file.exists())) {
    throw new Error("Snapshot not found")
  }

  return new Uint8Array(await file.arrayBuffer())
}

export async function deleteSnapshot(workspaceId: string): Promise<void> {
  const filepath = join(STORAGE_DIR, `${workspaceId}.snapshot`)
  const file = Bun.file(filepath)

  if (await file.exists()) {
    await Bun.write(filepath, new Uint8Array())
  }
}

export async function clearWorkspaceUpdates(
  workspaceId: string
): Promise<void> {
  const filepath = join(UPDATES_DIR, `${workspaceId}.updates.json`)
  await Bun.write(filepath, "[]")
}

export async function appendWorkspaceUpdate(
  workspaceId: string,
  update: Uint8Array
): Promise<void> {
  const filepath = join(UPDATES_DIR, `${workspaceId}.updates.json`)
  const file = Bun.file(filepath)

  let updates: string[] = []
  if (await file.exists()) {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        updates = parsed
      }
    } catch {
      updates = []
    }
  }

  updates.push(Buffer.from(update).toString("base64"))
  await Bun.write(filepath, JSON.stringify(updates))
}

export async function getWorkspaceUpdates(
  workspaceId: string
): Promise<string[]> {
  const filepath = join(UPDATES_DIR, `${workspaceId}.updates.json`)
  const file = Bun.file(filepath)

  if (!(await file.exists())) {
    return []
  }

  const text = await file.text()
  if (!text) {
    return []
  }

  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
