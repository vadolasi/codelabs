import type { FunctionComponent } from "preact"
import { Folder as IFolder, useStore } from "../../../store"
import File from "./File"
import Folder from "./Folder"
import NewFile from "./NewFile"
import { ContextMenuItem, useContextMenu } from "use-context-menu"

interface Props {
  workspaceId: string
}

const FileExplorer: FunctionComponent<Props> = ({ workspaceId }) => {
  const { workspaces, setFileToAdd } = useStore()
  const workspace = workspaces[workspaceId]
  const mainFolder = workspace.files["__main__"] as IFolder

  const { contextMenu, onContextMenu, onKeyDown } = useContextMenu(
    <>
      <ContextMenuItem onSelect={() => setFileToAdd(workspaceId, { parent: "__main__", type: "file" })}>Criar arquivo</ContextMenuItem>
      <ContextMenuItem onSelect={() => setFileToAdd(workspaceId, { parent: "__main__", type: "folder" })}>Criar pasta</ContextMenuItem>
    </>
  )

  return (
    <div _h="full" _w="full" _overflow="y-auto" onContextMenu={onContextMenu} onKeyDown={onKeyDown}>
      {contextMenu}
      {mainFolder && mainFolder.children.map(childId => (
        workspace.files[childId].type === "file" ?
          <File workspaceId={workspaceId} id={childId} /> :
          <Folder workspaceId={workspaceId} id={childId} />
      ))}
      {workspace.fileToAdd?.parent === "__main__" && <NewFile workspaceId={workspaceId} parentId={workspace.fileToAdd.parent} type={workspace.fileToAdd.type} />}
    </div>
  )
}

export default FileExplorer
