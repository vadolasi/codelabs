import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Editor from "../../components/Editor";
import codemirrorCollab from "../../components/Editor/plugins/collab";
import LoroDataProviderImplementation from "../../components/FileTree/dataProvider";
import DefaultLayout from "../../layouts/default";
import cn from "../../utils/cn";
import client from "../../utils/httpClient";
import useStore, { type User } from "../../utils/store";
import "@xterm/xterm/css/xterm.css";
import { useParams } from "react-router-dom";
import FileTree from "../../components/FileTree";
import LoadingIndicator from "../../components/LoadingIndicator";
import Codelabs from "../../core";
import nodejs from "../../core/languages/nodejs";

const WorkspacePage: React.FC = () => {
  const params = useParams();
  const user = useStore((state) => state.user) as User;
  const id = params.id as string;
  const treeId = user.id;

  const [isLoading, setIsLoading] = useState(true);

  const { data } = useSuspenseQuery({
    queryKey: ["workspace", id, user.id],
    queryFn: () => client.api.workspaces({ id })({ userId: treeId }).put(),
  });

  const terminalRef = useRef<HTMLDivElement>(null);

  const [tabs, setTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const { treeProvider, rootId, docTree, codelabs } = useMemo(() => {
    const codelabs = new Codelabs(id, treeId, data.data as Uint8Array);

    const docTree = codelabs.doc.getTree("fileTree");
    const rootId = docTree.roots()[0].id;

    const treeProvider = new LoroDataProviderImplementation(codelabs);

    const presence = codelabs.doc.getMap("presence");

    return { treeProvider, rootId, docTree, codelabs, presence };
  }, [data, id, treeId]);

  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  useEffect(() => {
    codelabs.on("iframeUrl", (iframeUrl) => {
      setIframeSrc(iframeUrl);
    });

    codelabs.once("loadingFinished", () => {
      setIsLoading(false);
    });

    codelabs.registerPlugin(nodejs);
  }, []);

  const extensions = useMemo(() => {
    if (activeTab) {
      if (!tabs.includes(activeTab as string)) {
        setTabs((tabs) => [...tabs, activeTab as string]);
      }

      return [codemirrorCollab(codelabs, activeTab, user.id)];
    }

    return [];
  }, [activeTab]);

  useEffect(() => {
    if (terminalRef.current) {
      codelabs.setTerminalElement(terminalRef.current);
    } else {
      codelabs.setTerminalElement(null);
    }
  }, [terminalRef]);

  return (
    <>
      {isLoading && (
        <DefaultLayout>
          <div className="flex gap-3">
            <LoadingIndicator />
            <h2 className="text-2xl">Loading workspace</h2>
          </div>
        </DefaultLayout>
      )}
      <DefaultLayout className={cn(isLoading && "hidden")}>
        <PanelGroup autoSaveId="main" direction="horizontal">
          <Panel
            id="sidebar"
            minSize={5}
            defaultSize={10}
            maxSize={20}
            order={1}
            collapsible
          >
            <FileTree
              treeProvider={treeProvider}
              rootId={rootId}
              onChangeTab={setActiveTab}
            />
          </Panel>
          <PanelResizeHandle
            hitAreaMargins={{ coarse: 0, fine: 0 }}
            className="bg-slate-950 w-2 flex items-center justify-center group p-0"
          >
            <div className="w-0.5 rounded h-5 bg-slate-800 group-hover:bg-cyan-700" />
          </PanelResizeHandle>
          <Panel order={2} id="main">
            <PanelGroup autoSaveId="second" direction="vertical">
              <Panel>
                {activeTab ? (
                  <div className="h-full">
                    <div className="flex gap-2 list-none">
                      {tabs.map((tab) => (
                        <button
                          type="button"
                          key={tab}
                          className={cn(activeTab === tab && "font-bold")}
                          onClick={() => setActiveTab(tab)}
                        >
                          {
                            docTree
                              .getNodeByID(tab as `${number}@${number}`)
                              .data.get<string>("name") as string
                          }
                        </button>
                      ))}
                    </div>
                    <Editor extensions={extensions} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <h2 className="text-2xl">Select a file</h2>
                  </div>
                )}
              </Panel>
              <PanelResizeHandle
                hitAreaMargins={{ coarse: 0, fine: 0 }}
                className="bg-slate-950 h-2 flex items-center justify-center group p-0"
              >
                <div className="h-0.5 rounded w-5 bg-slate-800 group-hover:bg-cyan-700" />
              </PanelResizeHandle>
              <Panel
                order={2}
                maxSize={50}
                defaultSize={20}
                collapsible
                minSize={10}
                id="terminal"
              >
                <div ref={terminalRef} className="h-full" />
              </Panel>
            </PanelGroup>
          </Panel>
          <PanelResizeHandle
            hitAreaMargins={{ coarse: 0, fine: 0 }}
            className="bg-slate-950 w-2 flex items-center justify-center group p-0"
          >
            <div className="w-0.5 rounded h-5 bg-slate-800 group-hover:bg-cyan-700" />
          </PanelResizeHandle>
          {iframeSrc !== null && (
            <Panel order={3}>
              <iframe
                title="Preview"
                src={iframeSrc}
                className="w-full h-full"
              />
            </Panel>
          )}
        </PanelGroup>
      </DefaultLayout>
    </>
  );
};

export default WorkspacePage;
