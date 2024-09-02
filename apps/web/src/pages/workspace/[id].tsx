import { useSuspenseQuery } from "@tanstack/react-query";
import { type FileSystemTree, WebContainer } from "@webcontainer/api";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { Loro, LoroText, type LoroTreeNode } from "loro-crdt";
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
import { useParams } from "wouter";
import FileTree from "../../components/FileTree";

type InputObject = {
  [key: string]: {
    fractional_index: string;
    id: string;
    parent: string | null;
    meta: {
      isFolder: boolean;
      name: string;
      content?: string;
    };
    index: number;
  };
};

function convertToDesiredStructure(input: InputObject): FileSystemTree {
  const output: FileSystemTree = {};

  function buildStructure(currentId: string, parentNode: FileSystemTree) {
    const currentItem = input[currentId];

    if (currentItem.meta.isFolder) {
      if (currentItem.meta.name !== "/") {
        parentNode[currentItem.meta.name] = { directory: {} };
        // @ts-ignore
        // biome-ignore lint/style/noParameterAssign: Necessary for recursion
        parentNode = parentNode[currentItem.meta.name].directory;
      }
      for (const key in input) {
        if (input[key].parent === currentId) {
          buildStructure(input[key].id, parentNode);
        }
      }
    } else {
      parentNode[currentItem.meta.name] = {
        file: {
          contents: currentItem.meta.content || "",
        },
      };
    }
  }

  for (const key in input) {
    if (input[key].parent === null) {
      buildStructure(input[key].id, output);
    }
  }

  return output;
}

const WorkspacePage: React.FC = () => {
  const params = useParams();
  const user = useStore((state) => state.user) as User;
  const id = params.id as string;
  const treeId = user.id;

  const { data } = useSuspenseQuery({
    queryKey: ["workspace", id, user.id],
    queryFn: () => client.api.workspaces({ id })({ userId: treeId }).put(),
  });

  const terminalRef = useRef<HTMLDivElement>(null);

  const [tabs, setTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const { treeProvider, rootId, docTree, doc, fileTree } = useMemo(() => {
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

    const fileTree: InputObject = {};

    for (const fileTreeItem of docTree.toJSON()) {
      fileTree[fileTreeItem.id] = fileTreeItem;
    }

    return { treeProvider, rootId, docTree, doc, presence, fileTree };
  }, [data, id, treeId]);

  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  useEffect(() => {
    const fitAddon = new FitAddon();

    const terminal = new Terminal({
      convertEol: true,
    });
    terminal.loadAddon(fitAddon);
    // biome-ignore lint/style/noNonNullAssertion: No need to check for null here
    terminal.open(terminalRef.current!);

    WebContainer.boot({ workdirName: "codelabs" }).then(
      async (webcontainerInstance) => {
        webcontainerInstance.on("server-ready", (_port, url) =>
          setIframeSrc(url),
        );

        const watch = await webcontainerInstance.spawn("npx", [
          "-y",
          "chokidar-cli",
          ".",
          "-i",
          '"(**/(node_modules|.git|_tmp_)**)"',
        ]);

        let watching = false;

        watch.output.pipeTo(
          new WritableStream({
            async write(data) {
              try {
                if (watching) {
                  const [type, path] = data.trim().split(":");
                  const pathParts = path.split("/");
                  const fileName = pathParts.pop();

                  function findOrCreateDir(
                    dirParent: LoroTreeNode<Record<string, unknown>>,
                    pathParts: string[],
                  ) {
                    const currentDir = pathParts.shift();
                    if (!currentDir) {
                      return dirParent;
                    }
                    const existingDir = dirParent
                      .children()
                      ?.find(
                        (node) =>
                          node.data.get("name") === currentDir &&
                          Boolean(node.data.get("isFolder")),
                      );
                    if (existingDir) {
                      return findOrCreateDir(existingDir, pathParts);
                    }
                    const newDir = docTree.createNode(dirParent.id);
                    newDir.data.set("name", currentDir);
                    newDir.data.set("isFolder", true);
                    return findOrCreateDir(newDir, pathParts);
                  }

                  const parentDir = findOrCreateDir(
                    docTree.getNodeByID(rootId),
                    pathParts,
                  );

                  let item: LoroTreeNode<Record<string, unknown>> | undefined;

                  switch (type) {
                    case "change":
                      item = parentDir
                        .children()
                        ?.find((node) => node.data.get("name") === fileName);

                      if (item) {
                        item.data
                          .getOrCreateContainer("content", new LoroText())
                          .insert(
                            0,
                            // @ts-ignore
                            await webcontainerInstance.fs.readFile(
                              path,
                              "utf-8",
                            ),
                          );
                      }
                      break;
                    case "add":
                      item = docTree.createNode(parentDir.id);
                      item.data.set("name", fileName);
                      item.data.set("isFolder", false);
                      item.data.setContainer("content", new LoroText()).insert(
                        0,
                        // @ts-ignore
                        await webcontainerInstance.fs.readFile(path, "utf-8"),
                      );
                      break;
                    case "unlink":
                      item = parentDir
                        .children()
                        ?.find((node) => node.data.get("name") === fileName);

                      if (item) {
                        docTree.delete(item.id);
                      }
                      break;
                    case "addDir":
                      item = docTree.createNode(parentDir.id);
                      item.data.set("name", fileName);
                      item.data.set("isFolder", true);
                      break;
                    case "unlinkDir":
                      item = parentDir
                        .children()
                        ?.find((node) => node.data.get("name") === fileName);

                      if (item) {
                        docTree.delete(item.id);
                      }
                      break;
                  }
                } else if (data.includes('Watching "."')) {
                  watching = true;
                  console.log("watching started");
                }

                doc.commit("runtime");
              } catch (e) {
                console.error(e);
              }
            },
          }),
        );

        function getFullPath(id: `${number}@${number}`): string {
          const node = docTree.getNodeByID(id);
          const name = String(node.data.get<string>("name"));
          const parent = node.parent()?.id;
          if (!parent || docTree.getNodeByID(parent).data.get("name") === "/") {
            return name;
          }
          return `${getFullPath(parent)}/${name}`;
        }

        docTree.subscribe(async ({ events, origin }) => {
          if (origin !== "runtime") {
            for (const { diff: event, path } of events) {
              if (event.type === "tree") {
                for (const diff of event.diff) {
                  const node = docTree.getNodeByID(diff.target);
                  const data = node.data;
                  const isFolder = Boolean(data.get("isFolder"));

                  const fullPath = getFullPath(diff.target);

                  switch (diff.action) {
                    case "create":
                      if (isFolder) {
                        await webcontainerInstance.fs.mkdir(fullPath, {
                          recursive: true,
                        });
                      } else {
                        await webcontainerInstance.fs.writeFile(
                          fullPath,
                          String(data.get<string>("content")),
                        );
                      }
                      break;
                  }
                }
              } else if (event.type === "text") {
                const target = path[path.length - 2] as `${number}@${number}`;
                await webcontainerInstance.fs.writeFile(
                  getFullPath(target),
                  String(docTree.getNodeByID(target).data.get("content")),
                );
              }
            }
          }
        });

        const files = convertToDesiredStructure(fileTree);

        await webcontainerInstance.mount(files);

        const shellProcess = await webcontainerInstance.spawn("jsh", {
          terminal: {
            cols: terminal.cols,
            rows: terminal.rows,
          },
        });

        shellProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              terminal.write(data);
            },
          }),
        );

        const input = shellProcess.input.getWriter();
        terminal.onData((data) => {
          input.write(data);
        });

        terminalRef.current?.addEventListener("resize", () => {
          fitAddon.fit();
          shellProcess.resize({
            cols: terminal.cols,
            rows: terminal.rows,
          });
        });

        fitAddon.fit();
      },
    );

    return () => {
      terminal.dispose();
    };
  }, []);

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
                  <Editor extensions={extensions} initialValue={initialValue} />
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
              <div ref={terminalRef} />
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
            <iframe title="Preview" src={iframeSrc} className="w-full h-full" />
          </Panel>
        )}
      </PanelGroup>
    </DefaultLayout>
  );
};

export default WorkspacePage;
