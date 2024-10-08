import * as ContextMenu from "@radix-ui/react-context-menu";
import {
  getMaterialFileIcon,
  getMaterialFolderIcon,
} from "file-extension-icon-js";
import { Tree, UncontrolledTreeEnvironment } from "react-complex-tree";
import type LoroDataProviderImplementation from "./dataProvider";

const FileTree: React.FC<{
  treeProvider: LoroDataProviderImplementation;
  rootId: `${number}@${number}`;
  onChangeTab: (tabId: string) => void;
}> = ({ treeProvider, rootId, onChangeTab }) => {
  return (
    <ContextMenu.Root>
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
                        <ContextMenu.Item className="select-none cursor-pointer">
                          New file
                        </ContextMenu.Item>
                        <ContextMenu.Item className="select-none cursor-pointer">
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
          <ContextMenu.Item className="select-none cursor-pointer">
            New file
          </ContextMenu.Item>
          <ContextMenu.Item className="select-none cursor-pointer">
            New folder
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};

export default FileTree;
