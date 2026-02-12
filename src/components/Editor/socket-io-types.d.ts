export type ServerToClientEvents = {
  "loro-update": (update: Uint8Array) => void
  "ephemeral-update": (update: Uint8Array) => void
}

export type ClientToServerEvents = {
  "connect-to-workspace": (workspaceId: string) => void
  "disconnect-from-workspace": (workspaceId: string) => void
  "loro-update": (workspaceId: string, update: Uint8Array) => Promise<void>
  "ephemeral-update": (workspaceId: string, update: Uint8Array) => Promise<void>
}
