import * as ContextMenu from "@radix-ui/react-context-menu";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Loro, LoroText } from "loro-crdt";
import { useMemo, useState } from "react";
import { Tree, UncontrolledTreeEnvironment } from "react-complex-tree";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useParams } from "react-router";
import Editor from "../../components/Editor";
import codemirrorCollab from "../../components/Editor/plugins/collab";
import DefaultLayout from "../../layouts/default";
import cn from "../../utils/cn";
import client from "../../utils/httpClient";
import useStore, { type User } from "../../utils/store";
import LoroDataProviderImplementation from "./dataProviser";

const WorkspacePage: React.FC = () => {
  const params = useParams();
  const user = useStore((state) => state.user) as User;
  const id = params.id as string;
  const treeId = "a"; // user.id;

  const { data } = useSuspenseQuery({
    queryKey: ["workspace", id, user.id],
    queryFn: () => client.api.workspaces({ id })({ userId: treeId }).put(),
  });

  const [tabs, setTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const { treeProvider, rootId, docTree, doc } = useMemo(() => {
    const workspace = client.api
      .workspaces({ id })({ userId: treeId })
      .subscribe();
    workspace.ws.binaryType = "arraybuffer";

    const doc = new Loro();
    doc.import(data.data as Uint8Array);

    let lastVersion = doc.version();

    doc.subscribe(({ by }) => {
      if (by === "local") {
        workspace.ws.send(doc.exportFrom(lastVersion));
        lastVersion = doc.version();
      }
    });

    const docTree = doc.getTree("fileTree");
    const rootId = docTree.roots()[0].id;

    const treeProvider = new LoroDataProviderImplementation(doc, docTree);

    workspace.ws.onmessage = (ev) => {
      doc.import(new Uint8Array(ev.data));
    };

    const presence = doc.getMap("presence");

    return { treeProvider, rootId, docTree, doc, presence };
  }, [data, id]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: dont need
  const { extensions, initialValue } = useMemo(() => {
    if (activeTab) {
      if (!tabs.includes(activeTab as string)) {
        setTabs((tabs) => [...tabs, activeTab as string]);
      }

      const docText = docTree
        .getNodeByID(activeTab as `${number}@${number}`)
        .data.getOrCreateContainer("content", new LoroText());

      return {
        extensions: [codemirrorCollab(doc, activeTab, user.id)],
        initialValue: docText.toString(),
      };
    }

    return { extensions: [], initialValue: "" };
  }, [activeTab]);

  return (
    <DefaultLayout>
      <div className="p-2w">OI</div>
      <PanelGroup autoSaveId="example" direction="horizontal">
        <Panel
          id="sidebar"
          minSize={5}
          defaultSize={10}
          maxSize={20}
          order={1}
          collapsible
        >
          <ContextMenu.Root>
            <h2 className="font-bold">Files</h2>
            <ContextMenu.Trigger asChild>
              <div className="h-full">
                <UncontrolledTreeEnvironment
                  dataProvider={treeProvider}
                  // biome-ignore lint/style/noNonNullAssertion: This never returns null
                  getItemTitle={(item) => item.data.split("/").pop()!}
                  renderItem={(item) => (
                    <ContextMenu.Root>
                      <ContextMenu.Trigger asChild>
                        <button
                          className="text-sm cursor-pointer flex gap-1"
                          type="button"
                          onClick={() => {
                            if (item.item.isFolder) {
                              if (item.context.isExpanded) {
                                item.context.collapseItem();
                              } else {
                                item.context.expandItem();
                              }
                            } else {
                              setActiveTab(item.item.index as string);
                            }
                          }}
                        >
                          {item.item.isFolder ? <>{item.arrow}📁</> : "📄"}
                          {item.title}
                        </button>
                      </ContextMenu.Trigger>
                      {item.item.isFolder && item.context.isExpanded && (
                        <div
                          className="border-l border-gray-100"
                          style={{ paddingLeft: `${item.depth + 1}rem` }}
                        >
                          {item.children}
                        </div>
                      )}
                      <ContextMenu.Portal>
                        <ContextMenu.Content className="bg-slate-100 p-2 rounded-md w-48">
                          <ContextMenu.Item className="select-none cursor-pointer">
                            New file
                          </ContextMenu.Item>
                          <ContextMenu.Item className="select-none cursor-pointer">
                            New folder
                          </ContextMenu.Item>
                        </ContextMenu.Content>
                      </ContextMenu.Portal>
                    </ContextMenu.Root>
                  )}
                  renderItemArrow={(item) => (
                    <div className="text-sm">
                      {item.context.isExpanded ? "🔽" : "🔼"}
                    </div>
                  )}
                  viewState={{}}
                >
                  <Tree treeId="files" rootItem={rootId} />
                </UncontrolledTreeEnvironment>
              </div>
            </ContextMenu.Trigger>
            <ContextMenu.Portal>
              <ContextMenu.Content className="bg-slate-100 p-2 rounded-md w-48">
                <ContextMenu.Item
                  className="select-none cursor-pointer"
                  onSelect={() =>
                    treeProvider.insertItem(rootId, {
                      isFolder: false,
                      data: "Teste",
                    })
                  }
                >
                  New file
                </ContextMenu.Item>
                <ContextMenu.Item className="select-none cursor-pointer">
                  New folder
                </ContextMenu.Item>
              </ContextMenu.Content>
            </ContextMenu.Portal>
          </ContextMenu.Root>
        </Panel>
        <PanelResizeHandle
          hitAreaMargins={{ coarse: 0, fine: 0 }}
          className="bg-slate-950 w-2 flex items-center justify-center group p-0"
        >
          <div className="w-0.5 rounded h-5 bg-slate-800 group-hover:bg-cyan-700" />
        </PanelResizeHandle>
        <Panel order={2} id="main">
          <div className="rounded h-full overflow-hidden">
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
                      {tab}
                    </button>
                  ))}
                </div>
                <Editor extensions={extensions} initialValue={initialValue} />
              </div>
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <h2 className="text-2xl">Select a file</h2>
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>
    </DefaultLayout>
  );
};

export default WorkspacePage;
