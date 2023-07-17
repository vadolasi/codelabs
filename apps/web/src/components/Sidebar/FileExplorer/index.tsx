import type { FunctionComponent } from "preact"
import { Folder as IFolder, useStore } from "../../../store"
import File from "./File"
import Folder from "./Folder"

interface Props {
  workspaceId: string
}

const FileExplorer: FunctionComponent<Props> = ({ workspaceId }) => {
  const { workspaces } = useStore()
  const workspace = workspaces[workspaceId]
  const mainFolder = workspace.files["__main__"] as IFolder

  return (
    <>
      {mainFolder.children.map(childId => (
        workspace.files[childId].type === "file" ?
          <File workspaceId={workspaceId} id={childId} /> :
          <Folder workspaceId={workspaceId} id={childId} />
      ))}
    </>
  )
}

export default FileExplorer
