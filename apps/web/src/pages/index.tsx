import { useEffect } from "react"
import Editor, { useMonaco } from "@monaco-editor/react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import DefaultLayout from "../layouts/default"

const IndexPage: React.FC = () => {
  const monaco = useMonaco()

  useEffect(() => {
    if (monaco) {
      console.log("Monaco is available")
    }
  }, [monaco])

  return (
    <DefaultLayout>
      <div className="p-2w">
        OI
      </div>
      <PanelGroup autoSaveId="example" direction="horizontal">
        <Panel id="sidebar" minSize={5} defaultSize={10} maxSize={20} order={1} collapsible>
          <div>oi</div>
        </Panel>
        <PanelResizeHandle hitAreaMargins={{ coarse: 0, fine: 0 }} className="bg-slate-950 w-2 flex items-center justify-center group p-0">
          <div className="w-0.5 rounded h-5 bg-slate-800 group-hover:bg-cyan-7000" />
        </PanelResizeHandle>
        <Panel order={2} id="main">
          <div className="rounded h-full overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="typescript"
              defaultValue="// Write your code here"
              loading="Carregando..."
              theme="vs-dark"
            />
          </div>
        </Panel>
      </PanelGroup>
    </DefaultLayout>
  )
}

export default IndexPage
