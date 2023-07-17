import { FunctionComponent } from "preact"
import { useStore } from "../store"
import { HocuspocusProvider } from "@hocuspocus/provider"
import * as Y from "yjs"
// @ts-ignore
import { yCollab } from "y-codemirror.next"
import useCodeMirror from "./useCodemirror"

interface Props {
  workspaceId: string
  fileId: string
}

const Editor: FunctionComponent<Props> = ({ workspaceId, fileId }) => {
  const { token, workspaces } = useStore()
  const workspace = workspaces[workspaceId]
  const file = workspace.files[fileId]

  const provider = new HocuspocusProvider({
    url: "ws://localhost:8000",
    name: `${workspace.roomId}:${workspaceId}:${file.id}`,
    token: token
  })
  const ytext = provider.document.getText("codemirror")
  const undoManager = new Y.UndoManager(ytext)

  const userColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`

  provider.awareness.setLocalStateField("user", {
    name: "Anonymous " + Math.floor(Math.random() * 100),
    color: userColor,
    colorLight: userColor
  })

  const { ref } = useCodeMirror([yCollab(ytext, provider.awareness, { undoManager })])

  return (
    <div _w="full" _h="full" _overflow="hidden" ref={ref} />
  )
}

export default Editor
