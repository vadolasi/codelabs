import { create } from "zustand"
import { immer } from "zustand/middleware/immer"

export interface FileSystemItemBase {
  id: string
  name: string
  parent: string
}

export type File = FileSystemItemBase & {
  type: "file"
}

export type Folder = FileSystemItemBase & {
  type: "folder"
  children: string[]
}

export type FileSystemItem = File | Folder

export interface Workspace {
  id: string
  readOnly: boolean
  roomId: string
  currentFile: string | null
  files: {
    [key: string]: FileSystemItem
  }
  openedFiles: string[]
}

export interface State {
  token: string | null
  workspaces: {
    [key: string]: Workspace
  }
}

export interface Actions {
  setToken: (token: string) => void
  addWorkspace: (roomId: string, id: string, readOnly: boolean) => void
  addFile: (id: string, workspaceId: string, parent: string, name: string, type: "file" | "folder") => void
}

export const useStore = create(immer<State & Actions>(set => ({
  token: null,
  workspaces: {},
  setToken: (token) => set(() => ({ token })),
  addWorkspace: (roomId, id, readOnly, ) => set(state => {
    state.workspaces[id] = {
      files: {},
      id,
      readOnly,
      roomId,
      currentFile: null,
      openedFiles: []
    }
  }),
  addFile: (id, workspaceId, parent, name, type) => set(state => {
    const workspace = state.workspaces[workspaceId]
    workspace.openedFiles.push(id)

    switch (type) {
      case "file":
        workspace.files[id] = {
          id,
          name,
          parent,
          type
        }
        break
      case "folder":
        workspace.files[id] = {
          id,
          name,
          parent,
          type,
          children: []
        }
    }

    workspace.currentFile = id
  })
})))
