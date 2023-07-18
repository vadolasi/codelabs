import type { FunctionComponent } from "preact"
import { FileSystemItem, Folder, useStore } from "../store"
// @ts-ignore
import { yCollab } from "y-codemirror.next"
import Editor from "./Editor"

interface Props {
  id: string
}

const Workspace: FunctionComponent<Props> = ({ id }) => {
  const { workspaces, addFile, updateFile } = useStore()
  const workspace = workspaces[id]
  const files = workspace.filesRemoteHandler!

  files.on("change", (changes: Map<string, { action: "add" | "delete" | "update", newValue?: FileSystemItem, oldValue?: FileSystemItem }>) => {
    changes.forEach(({ action, newValue }) => {
      switch (action) {
        case "add":
          addFile(
            newValue?.id!,
            id,
            newValue?.parent!,
            newValue?.name!,
            newValue?.type!,
            (newValue as Folder)?.children
          )
          break
        case "update":
          updateFile(
            id,
            newValue?.id!,
            newValue!
          )
          break
        default:
          console.log(action, newValue)
          break
      }
    })
  })

  return (
    <div key={id} _flex="~ col" _w="full" _h="full" _grow="~">
      <div _flex="~">
        {Object.values(workspace.files).map(file => workspace.openedFiles.includes(file.id) && (
          <div key={file.id}>{file.name}</div>
        ))}
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
