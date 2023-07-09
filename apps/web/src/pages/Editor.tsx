import CodeMirror from "@uiw/react-codemirror"
import * as Y from "yjs"
// @ts-ignore
import { yCollab } from "y-codemirror.next"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { useLocation } from "wouter-preact"
import { graphql } from "../gql"
import { useMutation } from "urql"
import { create } from "zustand"
import { nanoid } from "nanoid"
import { useEffect } from "preact/hooks"
import toast from "react-hot-toast"
import { immer } from "zustand/middleware/immer"

const joinRoomMutation = graphql(/* GraphQL */`
  mutation JoinRoom($username: String!, $roomId: String!) {
    joinRoom(
      username: $username
      id: $roomId
    )
  }
`)

interface File {
  opened: boolean
  id: string
  path: string
  name: string
  type: "file" | "folder"
  extensions: any[]
}

interface Workspace {
  id: string
  readOnly: boolean
  roomId: string
  currentFile: string | null
  files: File[]
}

interface State {
  token: string | null
  workspaces: Workspace[]
}

interface Actions {
  setToken: (token: string) => void
  addWorkspace: (roomId: string, id: string, readOnly: boolean) => void
  addFile: (workspaceId: string, path: string, name: string, type: "file" | "folder") => void
  currentFile: (workspaceId: string) => File
}

const useStore = create(immer<State & Actions>((set, get) => ({
  token: null,
  workspaces: [],
  setToken: (token) => set(() => ({ token })),
  addWorkspace: (roomId, id, readOnly) => set(state => {
    state.workspaces.push({
      files: [],
      id,
      readOnly,
      roomId,
      currentFile: null
    })
  }),
  addFile: (workspaceId, path, name, type) => set(state => {
    const index = state.workspaces.findIndex(workspace => workspace.id === workspaceId)
    const id = nanoid()
    const workspace = state.workspaces[index]
    const provider = new HocuspocusProvider({
      url: "ws://127.0.0.1:8000",
      name: `${workspace.roomId}:${workspaceId}:${id}`,
      token: state.token
    })
    const ytext = provider.document.getText("codemirror")
    const undoManager = new Y.UndoManager(ytext)

    const userColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`

    provider.awareness.setLocalStateField("user", {
      name: "Anonymous " + Math.floor(Math.random() * 100),
      color: userColor,
      colorLight: userColor
    })

    workspace.files.push({
      id,
      extensions: [yCollab(ytext, provider.awareness, { undoManager })],
      name,
      path,
      type,
      opened: true
    })
  }),
  currentFile: (workspaceId: string) => {
    const workspaces = get().workspaces
    const workspace = workspaces[workspaces.findIndex(workspace => workspace.id === workspaceId)]

    return workspace.files[workspace.files.findIndex(file => file.id === workspace.currentFile)]
  }
})))

interface Props {
  id: string
}

export default function Editor({ id }: Props) {
  const { workspaces, currentFile, setToken, addWorkspace } = useStore()

  const [, executeJoinRoom] = useMutation(joinRoomMutation)
  const [, navigate] = useLocation()

  useEffect(() => {
    executeJoinRoom({ roomId: id, username: "vadolasi" })
      .then(({ data, error }) => {
        if (error) {
          switch (error.message) {
            case "[GraphQL] Room not found":
              navigate("/")
              toast.error("A sala que você está tentando acessar não foi encontrada")
          }
        } else {
          setToken(data?.joinRoom!)
          addWorkspace(id, "main", true)
          addWorkspace(id, `user|vadolasi`, false)
        }
      })
  }, [])

  return (
    <div _w="screen" _h="screen" _flex="~">
      {workspaces.map(workspace => (
        <div key={workspace.id} _w="full" _h="full" _grow="~">
          <div _flex="~ col">
            {workspace.files.map(file => file.opened && (
              <div key={file.id}></div>
            ))}
          </div>
          {workspace.currentFile ? (
            <CodeMirror
              extensions={currentFile(workspace.id).extensions}
              width="100%"
              height="100%"
              className="grow"
              readOnly={workspace.readOnly}
              editable={!workspace.readOnly}
            />
          ) : (
            <h1>Nenhum arquivo selecionado</h1>
          )}
        </div>
      ))}
    </div>
  )
}
