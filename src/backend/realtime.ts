import { Server as Engine } from "@socket.io/bun-engine"
import { randomUUIDv7 } from "bun"
import { Queue, Worker } from "bunqueue/client"
import { and, eq } from "drizzle-orm"
import { LoroDoc } from "loro-crdt"
import { Server } from "socket.io"
import msgpackParser from "$lib/socketio-msgpack-parser"
import {
  getSnapshot,
  getWorkspaceUpdates,
  saveSnapshot
} from "../backend/lib/storage"
import { db, workspaces__users, workspaceUpdates } from "./database"
import { validateSessionToken } from "./modules/auth/auth.service"

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

io.use(async (socket, next) => {
  const cookieString = socket.handshake.headers.cookie || ""
  const cookies = Object.fromEntries(
    cookieString.split("; ").map((c) => c.split("="))
  )
  const sessionId = cookies.session

  if (!sessionId) {
    return next(new Error("Authentication error: No session cookie"))
  }

  const session = await validateSessionToken(sessionId)
  if (!session) {
    return next(new Error("Authentication error: Invalid session"))
  }

  const workspaceId = String(socket.handshake.query.workspaceId || "")
  if (!workspaceId) {
    return next(new Error("Workspace ID is required"))
  }

  const membership = await db.query.workspaces__users.findFirst({
    where: and(
      eq(workspaces__users.userId, session.userId),
      eq(workspaces__users.workspaceId, workspaceId)
    ),
    columns: {
      role: true
    }
  })

  if (!membership) {
    return next(new Error("Access denied: Not a member of this workspace"))
  }

  socket.data = {
    userId: session.userId,
    workspaceId,
    role: membership.role
  }

  next()
})

const engine = new Engine()
io.bind(engine)

io.on("connection", (socket) => {
  const { workspaceId, role } = socket.data
  const joinedWorkspaces = new Set<string>()

  if (workspaceId) {
    socket.join(workspaceId)
    joinedWorkspaces.add(workspaceId)
    markWorkspaceActive(workspaceId)
  }

  socket.on("connect-to-workspace", async (id) => {
    // Basic validation to prevent joining unauthorized workspaces after connection
    const membership = await db.query.workspaces__users.findFirst({
      where: and(
        eq(workspaces__users.userId, socket.data.userId),
        eq(workspaces__users.workspaceId, id)
      ),
      columns: { id: true }
    })

    if (membership) {
      socket.join(id)
      joinedWorkspaces.add(id)
      await markWorkspaceActive(id)
    }
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

  socket.on("sync", async (clientSnapshot, callback) => {
    const { workspaceId } = socket.data
    try {
      const { snapshot, updates } = await db.transaction(async (tx) => {
        const snapshot = await getSnapshot(workspaceId, tx)
        const updates = await getWorkspaceUpdates(workspaceId, tx)
        return { snapshot, updates }
      })

      const doc = new LoroDoc()
      if (snapshot) doc.import(snapshot)
      if (updates.length > 0) doc.importBatch(updates)

      // Criamos um doc temporário para extrair a versão do cliente do snapshot
      const tempDoc = new LoroDoc()
      tempDoc.import(clientSnapshot)

      const missing = doc.export({
        mode: "update",
        from: tempDoc.oplogVersion()
      })
      callback(missing)
    } catch (err) {
      console.error("[sync] Erro ao processar sincronização:", err)
    }
  })

  socket.on("loro-update", async (id, update) => {
    if (!id || id !== workspaceId) {
      return
    }

    if (role === "viewer") {
      console.warn(`User ${socket.data.userId} attempted to update as viewer`)
      return
    }

    socket.to(id).emit("loro-update", update)
    try {
      await db.insert(workspaceUpdates).values({
        id: randomUUIDv7(),
        workspaceId: id,
        update: Buffer.from(update),
        createdAt: new Date()
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
