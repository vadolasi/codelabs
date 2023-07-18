import type { FunctionComponent } from "preact"
import { Folder as IFolder, useStore } from "../../../store"
import File from "./File"
import { ContextMenuItem, useContextMenu } from "use-context-menu"

interface Props {
  workspaceId: string
  id: string
}

const Folder: FunctionComponent<Props> = ({ workspaceId, id }) => {
  const files = useStore(state => state.workspaces[workspaceId].files)
  const folder = files[id] as IFolder
  const setFileToAdd = useStore(state => state.setFileToAdd)

  const { contextMenu, onContextMenu, onKeyDown } = useContextMenu(
    <>
      <ContextMenuItem onSelect={() => setFileToAdd(workspaceId, { parent: id, type: "file" })}>Criar arquivo</ContextMenuItem>
      <ContextMenuItem onSelect={() => setFileToAdd(workspaceId, { parent: id, type: "folder" })}>Criar pasta</ContextMenuItem>
    </>
  )

  return (
    <>
      <div onContextMenu={onContextMenu} onKeyDown={onKeyDown}>
        {contextMenu}
        <span>{folder.name}</span>
      </div>
      <div _p="l-2">
        {folder.children.map(childId => (
          files[childId].type === "file" ?
            <File workspaceId={workspaceId} id={childId} /> :
            <Folder workspaceId={workspaceId} id={childId} />
        ))}
      </div>
    </>
  )
}

export default Folder
