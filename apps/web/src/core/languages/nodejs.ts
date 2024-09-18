import { type FileSystemTree, WebContainer } from "@webcontainer/api";
import { LoroText, type LoroTreeNode } from "loro-crdt";
import type Codelabs from "..";

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

export default function nodejs(codelabs: Codelabs) {
  const docTree = codelabs.doc.getTree("fileTree");
  const rootId = docTree.roots()[0].id;

  WebContainer.boot({ workdirName: "codelabs" }).then(
    async (webcontainerInstance) => {
      webcontainerInstance.on("server-ready", (_port, url) =>
        codelabs.setIframeUrl(url),
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
                    if (codelabs.pathsMap.has(path)) {
                      const content = docTree
                        .getNodeByID(
                          codelabs.pathsMap.get(path) as `${number}@${number}`,
                        )
                        .data.getOrCreateContainer("content", new LoroText());

                      const currentContent =
                        await webcontainerInstance.fs.readFile(path, "utf-8");

                      if (content.toString() !== currentContent) {
                        content.insert(
                          0,
                          // @ts-ignore
                          await webcontainerInstance.fs.readFile(path, "utf-8"),
                        );
                      }
                    }
                    break;
                  case "add":
                    if (!codelabs.pathsMap.has(path)) {
                      item = docTree.createNode(parentDir.id);
                      item.data.set("name", fileName);
                      item.data.set("isFolder", false);
                      item.data
                        .getOrCreateContainer("content", new LoroText())
                        .insert(
                          0,
                          // @ts-ignore
                          await webcontainerInstance.fs.readFile(path, "utf-8"),
                        );
                    }
                    break;
                  case "unlink":
                    if (codelabs.pathsMap.has(path)) {
                      docTree.delete(
                        codelabs.pathsMap.get(path) as `${number}@${number}`,
                      );
                    }
                    break;
                  case "addDir":
                    if (!codelabs.pathsMap.has(path)) {
                      item = docTree.createNode(parentDir.id);
                      item.data.set("name", fileName);
                      item.data.set("isFolder", true);
                    }
                    break;
                  case "unlinkDir":
                    if (codelabs.pathsMap.has(path)) {
                      docTree.delete(
                        codelabs.pathsMap.get(path) as `${number}@${number}`,
                      );
                    }
                    break;
                }
                codelabs.doc.commit("runtime");
              } else if (data.includes('Watching "."')) {
                watching = true;
                console.log("watching started");
              }
            } catch (e) {
              console.error(e);
            }
          },
        }),
      );

      docTree.subscribe(async ({ events, origin }) => {
        if (origin !== "runtime") {
          for (const { diff: event, path } of events) {
            if (event.type === "tree") {
              for (const diff of event.diff) {
                const node = docTree.getNodeByID(diff.target);
                const data = node.data;
                const isFolder = Boolean(data.get("isFolder"));

                const fullPath = codelabs.getFullPath(diff.target);

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
                codelabs.getFullPath(target),
                String(docTree.getNodeByID(target).data.get("content")),
              );
            }
          }
        }
      });

      const fileTree: InputObject = {};

      for (const fileTreeItem of docTree.toJSON()) {
        fileTree[fileTreeItem.id] = fileTreeItem;
      }

      const files = convertToDesiredStructure(fileTree);

      await webcontainerInstance.mount(files);

      const shellProcess = await webcontainerInstance.spawn("jsh", {
        terminal: {
          cols: codelabs.terminal.cols,
          rows: codelabs.terminal.rows,
        },
      });

      shellProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            codelabs.terminal.write(data);
          },
        }),
      );

      const input = shellProcess.input.getWriter();
      codelabs.terminal.onData((data) => {
        input.write(data);
      });

      codelabs.terminalElement?.addEventListener("resize", () => {
        codelabs.terminalAddon.fit();
        shellProcess.resize({
          cols: codelabs.terminal.cols,
          rows: codelabs.terminal.rows,
        });
      });

      codelabs.terminalAddon.fit();
    },
  );
}
