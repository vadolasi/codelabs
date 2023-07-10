import CodeMirror from "@uiw/react-codemirror"
import Button from "../components/Button"
import { File, useStore } from "../store"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { nanoid } from "nanoid"
import * as Y from "yjs"
// @ts-ignore
import { yCollab } from "y-codemirror.next"

interface Props {
  id: string
}

export default function Workspace({ id }: Props) {
  const { workspaces, addFile: addFileToStore, currentFile, token } = useStore()
  const workspace = workspaces.find(workspace => workspace.id === id)!

  const provider = new HocuspocusProvider({
    url: "ws://localhost:8000",
    name: `${workspace.roomId}:${id}:__files__`,
    token
  })

  const files = provider.document.getArray<File>()
  files.observe(() => {
    files.toArray().map(file => {
      if (!workspace.files.map(file => file.id).includes(file.id)) {
        const provider = new HocuspocusProvider({
          url: "ws://localhost:8000",
          name: `${workspace.roomId}:${id}:${file.id}`,
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

        addFileToStore(
          file.id,
          workspace.id,
          file.path,
          file.name,
          file.type,
          [yCollab(ytext, provider.awareness, { undoManager })]
        )
      }
    })
  })

  const addFile = () => {
    files.push([{
      id: nanoid(),
      name: "test.txt",
      path: "/",
      opened: true,
      type: "file"
    }])
  }

  return (
    <div key={id} _flex="~ col" _w="full" _h="full" _grow="~">
      <div _flex="~">
        {workspace.files.map(file => file.opened && (
          <div key={file.id}>{file.name}</div>
        ))}
        <Button onClick={addFile}>+</Button>
      </div>
      {workspace.currentFile ? (
        <CodeMirror
          extensions={workspace.fileEditorOptions[currentFile(workspace.id).id]}
          width="100%"
          height="100%"
          _grow="~"
          readOnly={workspace.readOnly}
          editable={!workspace.readOnly}
          theme="dark"
        />
      ) : (
        <h1>Nenhum arquivo selecionado</h1>
      )}
    </div>
  )
}
