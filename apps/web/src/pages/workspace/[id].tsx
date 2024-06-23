import Editor, { useMonaco } from "@monaco-editor/react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Mutex } from "async-mutex";
import { Loro, LoroText } from "loro-crdt";
import type * as Monaco from "monaco-editor";
import { useEffect, useMemo, useState } from "react";
import { Tree, UncontrolledTreeEnvironment } from "react-complex-tree";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useParams } from "react-router";
import LoadingIndicator from "../../components/LoadingIndicator";
import DefaultLayout from "../../layouts/default";
import cn from "../../utils/cn";
import client from "../../utils/httpClient";
import useStore, { type User } from "../../utils/store";
import LoroDataProviderImplementation from "./dataProviser";

const WorkspacePage: React.FC = () => {
  const monaco = useMonaco();
  const params = useParams();
  const user = useStore((state) => state.user) as User;
  const id = params.id as string;

  const { data } = useSuspenseQuery({
    queryKey: ["workspace", id, user.id],
    queryFn: () => client.api.workspaces({ id })({ userId: user.id }).put(),
  });

  const [tabs, setTabs] = useState<
    Map<string, { path: string; model: Monaco.editor.ITextModel }>
  >(new Map());
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const { doc, treeProvider, rootId } = useMemo(() => {
    const workspace = client.api
      .workspaces({ id })({ userId: user.id })
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
    return { doc, treeProvider, rootId };
  }, [data, id, user]);

  useEffect(() => {
    if (monaco && activeTab) {
      const docText = doc
        .getTree("fileTree")
        .getNodeByID(activeTab as `${number}@${number}`)
        .data.getOrCreateContainer("content", new LoroText());
      let tab = tabs.get(activeTab) as {
        path: string;
        model: Monaco.editor.ITextModel;
      };

      if (!tab) {
        let editor = monaco.editor.getModel(
          monaco.Uri.parse(activeTab),
        ) as Monaco.editor.ITextModel;

        if (!editor) {
          editor = monaco.editor.createModel(
            docText.toString(),
            "typescript",
            monaco.Uri.parse(activeTab),
          );

          let fromRemote = false;

          const mutex = new Mutex();

          docText.subscribe(({ events, by }) => {
            mutex.runExclusive(async () => {
              if (by === "import") {
                fromRemote = true;
                for (const { diff: event } of events) {
                  if (event.type === "text") {
                    let index = 0;
                    const edits: Monaco.editor.IIdentifiedSingleEditOperation[] =
                      [];

                    for (const change of event.diff) {
                      if (change.retain) {
                        index += change.retain;
                      } else if (change.insert) {
                        const pos = editor.getPositionAt(index);
                        const range = new monaco.Selection(
                          pos.lineNumber,
                          pos.column,
                          pos.lineNumber,
                          pos.column,
                        );
                        edits.push({
                          range,
                          text: change.insert,
                        });
                        index += change.insert.length;
                      } else if (change.delete) {
                        const pos = editor.getPositionAt(index);
                        const endPos = editor.getPositionAt(
                          index + change.delete,
                        );
                        const range = new monaco.Selection(
                          pos.lineNumber,
                          pos.column,
                          endPos.lineNumber,
                          endPos.column,
                        );
                        edits.push({
                          range,
                          text: "",
                        });
                      }

                      editor.applyEdits(edits);
                    }
                  }
                }
                fromRemote = false;
              }
            });
          });

          editor.onDidChangeContent((ev) => {
            if (!fromRemote && !ev.isFlush) {
              mutex.runExclusive(async () => {
                for (const change of ev.changes.sort(
                  (change1, change2) =>
                    change2.rangeOffset - change1.rangeOffset,
                )) {
                  docText.delete(change.rangeOffset, change.rangeLength);
                  docText.insert(change.rangeOffset, change.text);
                }
                doc.commit();
              });
            }
          });

          monaco.editor.getEditors()[0].onDidChangeCursorPosition(console.log);
        }

        tab = { path: activeTab, model: editor };

        editor.setValue(docText.toString());

        setTabs((tabs) => new Map(tabs.set(activeTab, tab)));
      }
    }
  }, [doc, monaco, activeTab, tabs]);

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
                            New folde
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
                  New folde
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
            {activeTab === null ? (
              <div className="flex items-center justify-center w-full h-full">
                <h2 className="text-2xl">Select a file</h2>
              </div>
            ) : tabs.get(activeTab) === undefined ? (
              <div
                className={cn("flex items-center justify-center w-full h-full")}
              >
                <LoadingIndicator />
              </div>
            ) : (
              <div className="flex gap-2 list-none">
                {[...tabs.keys()].map((tab) => (
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
            )}
            <Editor
              height={activeTab === null ? "0" : "100%"}
              loading={
                <LoadingIndicator
                  className={cn(activeTab === null && "hidden")}
                />
              }
              path={activeTab && tabs.get(activeTab)?.model ? activeTab : ""}
              theme="vs-dark"
              className={cn(activeTab === null && "hidden")}
            />
          </div>
        </Panel>
      </PanelGroup>
    </DefaultLayout>
  );
};

export default WorkspacePage;
