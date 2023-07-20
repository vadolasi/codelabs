import type { FunctionComponent } from "preact"
import { Folder as IFolder, useStore } from "../../../store"
import File from "./File"
import { ContextMenuItem, useContextMenu } from "use-context-menu"
import { useState } from "preact/hooks"
import NewFile from "./NewFile"

interface Props {
  workspaceId: string
  id: string
}

const Folder: FunctionComponent<Props> = ({ workspaceId, id }) => {
  const files = useStore(state => state.workspaces[workspaceId].files)
  const folder = files[id] as IFolder
  const setFileToAdd = useStore(state => state.setFileToAdd)
  const workspace = useStore(state => state.workspaces[workspaceId])
  const [opened, setOpened] = useState(false)

  const { contextMenu, onContextMenu, onKeyDown } = useContextMenu(
    <>
      <ContextMenuItem onSelect={() => setFileToAdd(workspaceId, { parent: id, type: "file" })}>Criar arquivo</ContextMenuItem>
      <ContextMenuItem onSelect={() => setFileToAdd(workspaceId, { parent: id, type: "folder" })}>Criar pasta</ContextMenuItem>
    </>
  )

  return (
    <>
      {contextMenu}
      <div _cursor="pointer" onContextMenu={onContextMenu} onKeyDown={onKeyDown} onClick={() => setOpened(!opened)} _text="sm gray-300 hover:white" _flex="~" _items="center" _gap="1">
        {opened ? (
          <>
            <div _text="lg" class="i-mdi-chevron-down"></div>
            <div _text="lg" class="i-vscode-icons-default-folder-opened"></div>
          </>
        ) : (
          <>
            <div _text="lg" class="i-mdi-chevron-right"></div>
            <div _text="lg" class="i-vscode-icons-default-folder"></div>
          </>
        )}
        <span _select="none">{folder.name}</span>
      </div>
      <div _p="l-1" hidden={!opened}>
        {folder.children.map(childId => (
          files[childId].type === "file" ?
            <File workspaceId={workspaceId} id={childId} /> :
            <Folder workspaceId={workspaceId} id={childId} />
        ))}
      </div>
      <div _p="l-1">
        {workspace.fileToAdd?.parent === id && <NewFile workspaceId={workspaceId} parentId={id} type={workspace.fileToAdd.type} />}
      </div>
    </>
  )
}

export default Folder
