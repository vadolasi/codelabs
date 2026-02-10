import { Server as Engine } from "@socket.io/bun-engine"
import { randomUUIDv7 } from "bun"
import { Queue, Worker } from "bunqueue/client"
import { asc, eq } from "drizzle-orm"
import { LoroDoc } from "loro-crdt"
import { Server } from "socket.io"
import msgpackParser from "$lib/socketio-msgpack-parser"
import { db } from "../backend/database"
import { workspaceUpdates } from "../backend/database/schema"

const SNAPSHOT_INTERVAL_MS = 60_000
const SNAPSHOT_DIR = "data/snapshots"

const activeWorkspaceCounts = new Map<string, number>()
const scheduledWorkspaces = new Set<string>()

function snapshotPath(workspaceId: string) {
  return `${SNAPSHOT_DIR}/${workspaceId}.bin`
}

async function readSnapshot(workspaceId: string): Promise<Uint8Array | null> {
  const file = Bun.file(snapshotPath(workspaceId))
  return (await file.exists()) ? new Uint8Array(await file.arrayBuffer()) : null
}

async function writeSnapshot(workspaceId: string, snapshot: Uint8Array) {
  await Bun.write(snapshotPath(workspaceId), snapshot)
}

async function getWorkspaceUpdates(workspaceId: string) {
  return await db
    .select()
    .from(workspaceUpdates)
    .where(eq(workspaceUpdates.workspaceId, workspaceId))
    .orderBy(asc(workspaceUpdates.createdAt))
}

async function clearWorkspaceUpdates(workspaceId: string) {
  const result = await db
    .delete(workspaceUpdates)
    .where(eq(workspaceUpdates.workspaceId, workspaceId))
  console.log(
    `[clearWorkspaceUpdates] workspaceId=${workspaceId} result=`,
    result
  )
}

async function refreshSnapshot(workspaceId: string) {
  const [savedSnapshot, updates] = await Promise.all([
    readSnapshot(workspaceId),
    getWorkspaceUpdates(workspaceId)
  ])

  console.log(
    `[refreshSnapshot] workspaceId=${workspaceId} updates.length=${updates.length}`
  )
  if (!savedSnapshot && updates.length === 0) return

  const doc = new LoroDoc()
  doc.detach()
  if (savedSnapshot) doc.import(savedSnapshot)
  if (updates.length > 0) {
    doc.importBatch(
      updates.map((u) =>
        typeof u.update === "string"
          ? Buffer.from(u.update)
          : new Uint8Array(u.update)
      )
    )
    console.log(
      `[refreshSnapshot] importBatch applied ${updates.length} updates`
    )
  }
  const snapshot = doc.export({ mode: "snapshot" })
  await writeSnapshot(workspaceId, snapshot)
  console.log(
    `[refreshSnapshot] snapshot written for workspaceId=${workspaceId}`
  )
  if (updates.length > 0) await clearWorkspaceUpdates(workspaceId)
}

function getSchedulerId(workspaceId: string) {
  return `workspace-snapshot:${workspaceId}`
}

const snapshotQueue = new Queue<{ workspaceId: string }>(
  "workspace-snapshots",
  { embedded: true }
)
const snapshotWorker = new Worker<{ workspaceId: string }>(
  "workspace-snapshots",
  async (job) => {
    await refreshSnapshot(job.data.workspaceId)
  },
  { embedded: true, concurrency: 1 }
)
snapshotWorker.on("failed", (job, err) => {
  console.error("Snapshot job failed", job?.id, err)
})

async function ensureScheduler(workspaceId: string) {
  if (scheduledWorkspaces.has(workspaceId)) return
  await snapshotQueue.upsertJobScheduler(
    getSchedulerId(workspaceId),
    { every: SNAPSHOT_INTERVAL_MS },
    { name: "snapshot", data: { workspaceId } }
  )
  scheduledWorkspaces.add(workspaceId)
}

async function removeScheduler(workspaceId: string) {
  if (!scheduledWorkspaces.has(workspaceId)) return
  await snapshotQueue.removeJobScheduler(getSchedulerId(workspaceId))
  scheduledWorkspaces.delete(workspaceId)
}

async function markWorkspaceActive(workspaceId: string) {
  const count = (activeWorkspaceCounts.get(workspaceId) ?? 0) + 1
  activeWorkspaceCounts.set(workspaceId, count)
  if (count === 1) await ensureScheduler(workspaceId)
}

async function markWorkspaceInactive(workspaceId: string) {
  const nextCount = (activeWorkspaceCounts.get(workspaceId) ?? 0) - 1
  if (nextCount <= 0) {
    activeWorkspaceCounts.delete(workspaceId)
    await removeScheduler(workspaceId)
    return
  }
  activeWorkspaceCounts.set(workspaceId, nextCount)
}

const io = new Server({ parser: msgpackParser })
const engine = new Engine()
io.bind(engine)

io.on("connection", (socket) => {
  const workspaceId = String(socket.handshake.query.workspaceId || "")
  const joinedWorkspaces = new Set<string>()
  if (workspaceId) {
    socket.join(workspaceId)
    joinedWorkspaces.add(workspaceId)
    markWorkspaceActive(workspaceId)
  }

  socket.on("connect-to-workspace", async (id) => {
    socket.join(id)
    joinedWorkspaces.add(id)
    await markWorkspaceActive(id)
  })

  socket.on("disconnect-from-workspace", async (id) => {
    socket.leave(id)
    if (joinedWorkspaces.has(id)) {
      joinedWorkspaces.delete(id)
      await markWorkspaceInactive(id)
    }
  })

  socket.on("disconnect", async () => {
    await Promise.all(Array.from(joinedWorkspaces).map(markWorkspaceInactive))
    joinedWorkspaces.clear()
  })

  socket.on("loro-update", async (id, update) => {
    if (!id) {
      console.log("[loro-update] Ignorado: id vazio")
      return
    }
    console.log("[loro-update] Recebido:", { id, update })
    socket.to(id).emit("loro-update", update)
    try {
      const result = await db.insert(workspaceUpdates).values({
        id: randomUUIDv7(),
        workspaceId: id,
        update: Buffer.from(update),
        createdAt: new Date()
      })
      console.log("[loro-update] Insert result:", result)
    } catch (err) {
      console.error("[loro-update] Erro ao inserir update:", err)
    }
  })

  socket.on("persist-snapshot", async (id, snapshot) => {
    if (!id) return
    await writeSnapshot(id, new Uint8Array(snapshot))
    await clearWorkspaceUpdates(id)
  })

  socket.on("ephemeral-update", (id, update) => {
    if (!id) return
    socket.to(id).emit("ephemeral-update", update)
  })
})

export default engine
