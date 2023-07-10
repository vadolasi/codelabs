import { create } from "zustand"
import { immer } from "zustand/middleware/immer"

export interface File {
  opened: boolean
  id: string
  path: string
  name: string
  type: "file" | "folder"
}

export interface Workspace {
  id: string
  readOnly: boolean
  roomId: string
  currentFile: string | null
  files: File[]
  fileEditorOptions: {
    [key: string]: any[]
  }
}

export interface State {
  token: string | null
  workspaces: Workspace[]
}

export interface Actions {
  setToken: (token: string) => void
  addWorkspace: (roomId: string, id: string, readOnly: boolean) => void
  addFile: (id: string, workspaceId: string, path: string, name: string, type: "file" | "folder", extensions: any[]) => void
  currentFile: (workspaceId: string) => File
}

export const useStore = create(immer<State & Actions>((set, get) => ({
  token: null,
  workspaces: [],
  setToken: (token) => set(() => ({ token })),
  addWorkspace: (roomId, id, readOnly) => set(state => {
    state.workspaces.push({
      files: [],
      id,
      readOnly,
      roomId,
      currentFile: null,
      fileEditorOptions: {}
    })
  }),
  addFile: (id, workspaceId, path, name, type, extensions) => set(state => {
    const index = state.workspaces.findIndex(workspace => workspace.id === workspaceId)
    const workspace = state.workspaces[index]
    workspace.fileEditorOptions[id] = extensions

    workspace.files.push({
      id,
      name,
      path,
      type,
      opened: true
    })

    workspace.currentFile = id
  }),
  currentFile: (workspaceId: string) => {
    const workspaces = get().workspaces
    const workspace = workspaces[workspaces.findIndex(workspace => workspace.id === workspaceId)]

    return workspace.files[workspace.files.findIndex(file => file.id === workspace.currentFile)]
  }
})))
