import { useState } from "preact/hooks"
import TabItem from "./TabItem"
import { useStore } from "../../store"
import type { FunctionComponent } from "preact"
import WorkspaceFiles from "./WorkspaceFiles"
import TabContent from "./TabContent"

const Sidebar: FunctionComponent = () => {
  const { workspaces } = useStore()

  const [activeTab, setActiveTab] = useState<string | null>(null)

  return (
    <div _flex="~" _h="full">
      <div _flex="~ col" _w="12" _border="r-1 coolgray-800">
        <TabItem id="files" activeTab={activeTab} setActiveTab={setActiveTab} icon={<div class="i-mdi-file-outline" />} />
      </div>
      {activeTab !== null && (
        <div _flex="~ col" _w="64" _border="r-1 coolgray-800">
          <span _m="1" _text="sm" _font="bold">Arquivos</span>
          <TabContent id="files" activeTab={activeTab}>
            {Object.values(workspaces).map(workspace => <WorkspaceFiles workspace={workspace} />)}
          </TabContent>
        </div>
      )}
    </div>
  )
}

export default Sidebar
