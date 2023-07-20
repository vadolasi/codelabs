import { FunctionComponent } from "preact"
import { useState } from "preact/hooks"
import FileExplorer from "./FileExplorer"
import { Workspace } from "../../store"

interface Props {
  workspace: Workspace
}

const WorkspaceFiles: FunctionComponent<Props> = ({ workspace }) => {
  const [opened, setOpened] = useState(false)

  return (
    <>
      <div _w="full" _flex="~ col" _m="-0.1">
        <div _h="5" _select="none" _border="y-1 coolgray-800" _flex="~" _cursor="pointer" onClick={() => setOpened(!opened)}>
          <span _text="sm" _uppercase="~" _flex="~" _items="center" _gap="1">
            {opened ? <div _text="base" class="i-mdi-chevron-down"></div> : <div _text="base" class="i-mdi-chevron-right"></div>}
            {workspace.id}
          </span>
        </div>
      </div>
      <div _w="full" _overflow="y-auto" hidden={!opened} _grow="~">
        <FileExplorer workspaceId={workspace.id} />
      </div>
    </>
  )
}

export default WorkspaceFiles
