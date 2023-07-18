import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { YKeyValue } from "y-utility/y-keyvalue"

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
  filesRemoteHandler: YKeyValue<FileSystemItem> | null
  fileToAdd: {
    parent: string
    type: "file" | "folder"
  } | null
}

export interface State {
  token: string | null
  workspaces: {
    [key: string]: Workspace
  }
}

export interface Actions {
  setToken: (token: string) => void
  addWorkspace: (roomId: string, id: string, readOnly: boolean, filesRemoteHandler: YKeyValue<FileSystemItem>) => void
  addFile: (id: string, workspaceId: string, parent: string, name: string, type: "file" | "folder", children?: string[]) => void
  updateFile: (workspaceId: string, id: string, file: FileSystemItem) => void
  setFileToAdd: (workspaceId: string, fileToAdd: { parent: string, type: "file" | "folder" } | null) => void
}

export const useStore = create(immer<State & Actions>(set => ({
  token: null,
  workspaces: {},
  setToken: (token) => set(() => ({ token })),
  addWorkspace: (roomId, id, readOnly, filesRemoteHandler) => set(state => {
    state.workspaces[id] = {
      files: {},
      id,
      readOnly,
      roomId,
      currentFile: null,
      openedFiles: [],
      filesRemoteHandler,
      fileToAdd: null
    }
  }),
  addFile: (id, workspaceId, parent, name, type, children = []) => set(state => {
    const workspace = state.workspaces[workspaceId]

    if (!workspace.files[id]) {
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
            children
          }
        }
    }

    if (type === "file") {
      workspace.openedFiles.push(id)
      workspace.currentFile = id
    }
  }),
  updateFile: (workspaceId, id, file) => set(state => {
    const workspace = state.workspaces[workspaceId]

    workspace.files[id] = file
  }),
  setFileToAdd: (workspaceId, fileToAdd) => set(state => {
    const workspace = state.workspaces[workspaceId]

    workspace.fileToAdd = fileToAdd
  })
})))
