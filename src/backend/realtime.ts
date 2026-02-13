import { Server as Engine } from "@socket.io/bun-engine"
import { randomUUIDv7 } from "bun"
import { Queue, Worker } from "bunqueue/client"
import { eq } from "drizzle-orm"
import { LoroDoc } from "loro-crdt"
import { Server } from "socket.io"
import msgpackParser from "$lib/socketio-msgpack-parser"
import {
  getSnapshot,
  getWorkspaceUpdates,
  saveSnapshot
} from "../backend/lib/storage"
import { db, workspaces, workspaceUpdates } from "./database"

const SNAPSHOT_INTERVAL_MS = 60_000

const activeWorkspaceCounts = new Map<string, number>()
const scheduledWorkspaces = new Set<string>()

async function refreshSnapshot(workspaceId: string) {
  let savedSnapshot: Uint8Array | null = null
  try {
    savedSnapshot = await getSnapshot(workspaceId)
  } catch {}

  const updates = await getWorkspaceUpdates(workspaceId)

  if (!savedSnapshot && updates.length === 0) return

  const doc = new LoroDoc()
  if (savedSnapshot) doc.import(savedSnapshot)
  if (updates.length > 0) {
    doc.importBatch(updates)
  }
  const snapshot = doc.export({ mode: "snapshot" })

  await saveSnapshot(workspaceId, snapshot)
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
    await refreshSnapshot(workspaceId)
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
      return
    }
    socket.to(id).emit("loro-update", update)
    try {
      await db.transaction(async (tx) => {
        await tx.insert(workspaceUpdates).values({
          id: randomUUIDv7(),
          workspaceId: id,
          update: Buffer.from(update),
          createdAt: new Date()
        })
        await tx
          .update(workspaces)
          .set({ updatedAt: new Date() })
          .where(eq(workspaces.id, id))
      })
    } catch (err) {
      console.error("[loro-update] Erro ao inserir update:", err)
    }
  })

  socket.on("ephemeral-update", (id, update) => {
    if (!id) return
    socket.to(id).emit("ephemeral-update", update)
  })
})

export default engine
