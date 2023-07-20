import { FunctionComponent } from "preact"
import { useStore } from "../store"
import * as Y from "yjs"
// @ts-ignore
import { yCollab } from "y-codemirror.next"
import useCodeMirror from "./useCodemirror"
import { getProvider } from "../utils"
import randomcolor from "randomcolor"

interface Props {
  workspaceId: string
  fileId: string
}

const Editor: FunctionComponent<Props> = ({ workspaceId, fileId }) => {
  const { workspaces } = useStore()
  const workspace = workspaces[workspaceId]
  const file = workspace.files[fileId]

  const provider = getProvider(`${workspace.roomId}:${workspaceId}:${file.id}`)
  const ytext = provider.document.getText("codemirror")
  const undoManager = new Y.UndoManager(ytext)

  provider.awareness.setLocalStateField("user", {
    name: "vadolasi",
    color: randomcolor({ luminosity: "dark" }),
    colorLight: randomcolor({ luminosity: "light" })
  })

  const { ref } = useCodeMirror([yCollab(ytext, provider.awareness, { undoManager })])

  return (
    <div _w="full" _h="full" _overflow="hidden" ref={ref} />
  )
}

export default Editor
