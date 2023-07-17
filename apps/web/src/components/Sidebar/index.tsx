import { useState } from "preact/hooks"
import TabItem from "./TabItem"
import TabContent from "./TabContent"
import { useStore } from "../../store"
import type { FunctionComponent } from "preact"
import FileExplorer from "./FileExplorer"

const Sidebar: FunctionComponent = () => {
  const { workspaces } = useStore()

  const [activeTab, setActiveTab] = useState<string | null>(null)

  return (
    <div _flex="~" _h="full">
      <div _flex="~ col" _w="12" _border="~ blue-500 r-1">
        <TabItem id="files" activeTab={activeTab} setActiveTab={setActiveTab} icon={<div class="i-mdi-file" />} />
      </div>
      {activeTab !== null && (
        <div _h="full" _w="50">
          <TabContent id="files" activeTab={activeTab}>
            {Object.values(workspaces).map(workspace => (
              <div _w="full">
                <div _h="5" _w="full">
                  <span>Workspace: {workspace.id}</span>
                </div>
                <div _w="full" _h="full" _overflow="y-auto">
                  <FileExplorer workspaceId={workspace.id} />
                </div>
              </div>
            ))}
          </TabContent>
        </div>
      )}
    </div>
  )
}

export default Sidebar
