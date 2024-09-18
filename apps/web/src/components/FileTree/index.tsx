import * as ContextMenu from "@radix-ui/react-context-menu";
import {
  getMaterialFileIcon,
  getMaterialFolderIcon,
} from "file-extension-icon-js";
import { useState } from "react";
import {
  Tree,
  type TreeItemIndex,
  UncontrolledTreeEnvironment,
} from "react-complex-tree";
import useShowHide from "../../utils/useShowHide";
import type LoroDataProviderImplementation from "./dataProvider";
import NewFileDialog from "./newFileDialog";

const FileTree: React.FC<{
  treeProvider: LoroDataProviderImplementation;
  rootId: `${number}@${number}`;
  onChangeTab: (tabId: string) => void;
}> = ({ treeProvider, rootId, onChangeTab }) => {
  const newFileDialog = useShowHide();
  const newFolderDialog = useShowHide();
  const deleteFileDialog = useShowHide();
  const renameFileDialog = useShowHide();
  const renameFolderDialog = useShowHide();

  const [data, setData] = useState<{
    isFolder: boolean;
    parentItemId: string;
  } | null>(null);

  const openNewFileDialog = (
    isFolder: boolean,
    parentItemId: TreeItemIndex,
  ) => {
    setData({ isFolder, parentItemId: String(parentItemId) });
    newFileDialog.show();
  };

  const handleNewFileDialog = (name: string) => {
    setData(null);
    newFileDialog.hide();
    if (data) {
      treeProvider.insertItem(data.parentItemId, {
        data: name,
        isFolder: data.isFolder,
      });
    }
  };

  return (
    <ContextMenu.Root>
      <NewFileDialog
        handler={newFileDialog}
        onFileCreate={handleNewFileDialog}
      />

      <h2 className="font-bold">Files</h2>
      <ContextMenu.Trigger asChild>
        <div className="h-full">
          <UncontrolledTreeEnvironment
            dataProvider={treeProvider}
            getItemTitle={(item) => item.data.split("/").pop()!}
            canDragAndDrop={true}
            renderItem={(item) => (
              <ContextMenu.Root key={item.item.index}>
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
                        onChangeTab(item.item.index as string);
                      }
                    }}
                  >
                    {item.item.isFolder ? (
                      <>
                        {item.arrow}
                        <img
                          src={getMaterialFolderIcon(item.title as string)}
                          alt={String(item.title)}
                          width="20"
                        />
                      </>
                    ) : (
                      <img
                        src={getMaterialFileIcon(item.title as string)}
                        alt={String(item.title)}
                        width="20"
                      />
                    )}
                    {item.title}
                  </button>
                </ContextMenu.Trigger>
                {item.item.isFolder && item.context.isExpanded && (
                  <div
                    className="border-l border-gray-100"
                    style={{ paddingLeft: "1rem" }}
                  >
                    {item.children}
                  </div>
                )}
                <ContextMenu.Portal>
                  <ContextMenu.Content className="bg-slate-100 p-2 rounded-md w-48">
                    {item.item.isFolder ? (
                      <>
                        <ContextMenu.Item
                          className="select-none cursor-pointer"
                          onSelect={() =>
                            openNewFileDialog(false, item.item.index)
                          }
                        >
                          New file
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className="select-none cursor-pointer"
                          onSelect={() =>
                            openNewFileDialog(true, item.item.index)
                          }
                        >
                          New folder
                        </ContextMenu.Item>
                      </>
                    ) : (
                      <ContextMenu.Item
                        className="select-none cursor-pointer"
                        onSelect={() =>
                          treeProvider.onRenameItem(item.item, "asdf")
                        }
                      >
                        Rename
                      </ContextMenu.Item>
                    )}
                    <ContextMenu.Item
                      className="select-none cursor-pointer"
                      onSelect={() =>
                        treeProvider.onRenameItem(item.item, "asdf")
                      }
                    >
                      Delete
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
            onSelect={() => openNewFileDialog(false, rootId)}
          >
            New file
          </ContextMenu.Item>
          <ContextMenu.Item
            className="select-none cursor-pointer"
            onSelect={() => openNewFileDialog(true, rootId)}
          >
            New folder
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};

export default FileTree;
