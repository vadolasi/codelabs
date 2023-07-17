import type { FunctionComponent } from "preact"
import { File as IFile, useStore } from "../../../store"

interface Props {
  workspaceId: string
  id: string
}

const File: FunctionComponent<Props> = ({ workspaceId, id }) => {
  const file = useStore(state => state.workspaces[workspaceId].files[id]) as IFile

  return (
    <>
      <span>{file.name}</span>
    </>
  )
}

export default File
