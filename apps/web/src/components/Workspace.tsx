import type { FunctionComponent } from "preact"
import Button from "../components/Button"
import { FileSystemItem, useStore } from "../store"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { nanoid } from "nanoid"
import * as Y from "yjs"
// @ts-ignore
import { yCollab } from "y-codemirror.next"
import Editor from "./Editor"

interface Props {
  id: string
}

const Workspace: FunctionComponent<Props> = ({ id }) => {
  const { workspaces, addFile: addFileToStore, token } = useStore()
  const workspace = workspaces[id]

  const ydoc = new Y.Doc()

  new HocuspocusProvider({
    url: "ws://localhost:8000",
    name: `${workspace.roomId}:${id}:__files__`,
    document: ydoc,
    token
  })

  const handleUpdate = (files: FileSystemItem[]) => {
    files.map(file => {
      if (!Object.keys(workspace.files).includes(file.id)) {
        addFileToStore(
          file.id,
          workspace.id,
          file.parent,
          file.name,
          file.type
        )
      }
    })
  }

  const files = ydoc.getArray<FileSystemItem>(`${workspace.roomId}:__files__`)
  files.observe(() => handleUpdate(files.toArray()))

  const addFile = () => {
    files.push([{
      id: nanoid(),
      name: "test.txt",
      parent: "__main__",
      type: "file"
    }])
  }

  return (
    <div key={id} _flex="~ col" _w="full" _h="full" _grow="~">
      <div _flex="~">
        {Object.values(workspace.files).map(file => workspace.openedFiles.includes(file.id) && (
          <div key={file.id}>{file.name}</div>
        ))}
        <Button onClick={addFile}>+</Button>
      </div>
      {workspace.currentFile ? (
        <Editor workspaceId={workspace.id} fileId={workspace.currentFile} />
      ) : (
        <h1>Nenhum arquivo selecionado</h1>
      )}
    </div>
  )
}

export default Workspace
