import type { FunctionComponent } from "preact"
import { Folder as IFolder, useStore } from "../../../store"
import File from "./File"

interface Props {
  workspaceId: string
  id: string
}

const Folder: FunctionComponent<Props> = ({ workspaceId, id }) => {
  const files = useStore(state => state.workspaces[workspaceId].files)
  const folder = files[id] as IFolder

  return (
    <>
      {folder.children.map(childId => (
        files[childId].type === "file" ?
          <File workspaceId={workspaceId} id={childId} /> :
          <Folder workspaceId={workspaceId} id={childId} />
      ))}
    </>
  )
}

export default Folder
