import {
  LoroList,
  LoroText,
  type LoroTree,
  type LoroTreeNode,
} from "loro-crdt";
import type {
  Disposable,
  TreeDataProvider,
  TreeItem,
  TreeItemIndex,
} from "react-complex-tree";
import type Codelabs from "../../core";

export default class LoroDataProviderImplementation
  implements TreeDataProvider
{
  private codelabs: Codelabs;
  private docTree: LoroTree;

  private treeChangeListeners: ((changedItemIds: TreeItemIndex[]) => void)[] =
    [];

  constructor(codelabs: Codelabs) {
    this.codelabs = codelabs;
    this.docTree = codelabs.docTree;

    this.docTree.subscribe(({ events, origin }) => {
      if (origin !== "fileTree") {
        for (const { diff: event } of events) {
          if (event.type === "tree") {
            for (const diff of event.diff) {
              const changed = [diff.target];

              if (diff.action === "create" && diff.parent) {
                changed.push(diff.parent);
              }

              for (const listener of this.treeChangeListeners) {
                listener(changed);
              }
            }
          }
        }
      }
    });
  }

  public async getTreeItem(itemId: TreeItemIndex) {
    const node = this.docTree.getNodeByID(itemId as `${number}@${number}`);

    const isFolder = node.data.get("isFolder") as boolean;

    let children: LoroTreeNode[] = [];

    if (isFolder) {
      children = this.docTree
        .nodes()
        .filter((node) => node.parent()?.id === itemId);
    }

    return {
      data: node.data.get("name") as string,
      isFolder,
      index: itemId,
      canMove: true,
      canRename: true,
      children: children.map((child) => child.id),
    };
  }

  public async onChangeItemChildren(
    itemId: TreeItemIndex,
    newChildren: TreeItemIndex[],
  ) {
    const children = this.docTree
      .getNodeByID(itemId as `${number}@${number}`)
      .data.getOrCreateContainer("children", new LoroList());

    for (const child of newChildren) {
      children.push(child);
    }
  }

  public onDidChangeTreeData(
    listener: (changedItemIds: TreeItemIndex[]) => void,
  ): Disposable {
    this.treeChangeListeners.push(listener);
    return {
      dispose: () =>
        this.treeChangeListeners.splice(
          this.treeChangeListeners.indexOf(listener),
          1,
        ),
    };
  }

  public async onRenameItem(item: TreeItem, name: string): Promise<void> {
    this.docTree
      .getNodeByID(item.index as `${number}@${number}`)
      .data.set("name", name);
    this.codelabs.doc.commit("fileTree");
  }

  public async insertItem(
    parentItemId: string,
    newItem: { isFolder: boolean; data: string },
  ) {
    const item = this.docTree
      .getNodeByID(parentItemId as `${number}@${number}`)
      .createNode().data;

    item.setContainer("content", new LoroText());
    item.set("name", newItem.data);
    item.set("isFolder", newItem.isFolder);

    this.codelabs.doc.commit("fileTree");

    for (const listener of this.treeChangeListeners) {
      listener([parentItemId]);
    }

    return item.id;
  }
}
