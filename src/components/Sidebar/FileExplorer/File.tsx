import type { FunctionComponent } from "preact"
import { File as IFile, useStore } from "../../../store"
import classnames from "classnames"

interface Props {
  workspaceId: string
  id: string
}

const File: FunctionComponent<Props> = ({ workspaceId, id }) => {
  const workspace = useStore(state => state.workspaces[workspaceId])
  const file = useStore(state => state.workspaces[workspaceId].files[id]) as IFile

  return (
    <div _cursor="pointer" _p="x-1 l-5" _bg={classnames("opacity-5", { "blue-400": workspace.currentFile === id })}>
      <span _select="none" _text="sm" _flex="~" _items="center" _gap="1">
        <div _text="lg" class="i-vscode-icons-default-file"></div>
        {file.name}
      </span>
    </div>
  )
}

export default File
