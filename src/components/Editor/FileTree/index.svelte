<script lang="ts">
import {
  createTree,
  hotkeysCoreFeature,
  renamingFeature,
  selectionFeature,
  syncDataLoaderFeature
} from "@headless-tree/core"
import * as menu from "@zag-js/menu"
import { normalizeProps, useMachine } from "@zag-js/svelte"
import { LoroList, LoroMap } from "loro-crdt"
import picoMatch from "picomatch"
import { onMount, tick } from "svelte"
import editorState, {
  engine, 
} from "../editorState.svelte"
import TreeItem from "./TreeItem.svelte"

let render = $state(0)
const isMatch = picoMatch("**/node_modules/**", { dot: true })

function ensureDirectory(path: string) {
  const existing = editorState.filesMap.get(path)
  if (!existing) {
    const dirMap = new LoroMap<Record<string, Item | LoroList>>()
    dirMap.set("data", { type: "directory", path })
    dirMap.setContainer("children", new LoroList<string>())
    editorState.filesMap.setContainer(path, dirMap)
    return dirMap
  }

  const children = existing.get("children")
  if (!(children instanceof LoroList)) {
    existing.setContainer("children", new LoroList<string>())
  }

  return existing
}

function addChildToParent(parentPath: string, childPath: string) {
  const parent = ensureDirectory(parentPath)
  const children = parent.get("children") as LoroList<string>
  const list = children.toArray()
  if (!list.includes(childPath)) {
    children.push(childPath)
  }
}

function registerTree(node: HTMLElement) {
  tree.registerElement(node)
  tree.setMounted(true)
  return {
    destroy() {
      tree.registerElement(null)
      tree.setMounted(false)
    }
  }
}

ensureDirectory("/")

const tree = createTree<Item>({
  rootItemId: "/",
  state: {
    expandedItems: ["/"]
  },
  getItemName: (item) => item.getItemData().path?.split("/")?.pop() || "",
  isItemFolder: (item) => item.getItemData().type === "directory",
  onPrimaryAction: (item) => {
    const data = item.getItemData()
    if (data.type !== "directory") {
      editorState.setCurrentTab(item)
    }
  },
  canRename: () => true,
  onRename: async (item, newName) => {
    const parentPath = item.getParent()!.getItemData().path
    const newPath = `${parentPath}/${newName}`
    if (engine.current) {
      await engine.current.fs.rename(item.getItemData().path, newPath)
    }
  },
  dataLoader: {
    getItem: (itemId) => {
      const entry = editorState.filesMap.get(itemId)
      if (entry) {
        return entry.get("data") as Item
      }
      if (itemId === "/") {
        return ensureDirectory("/").get("data") as Item
      }
      return { type: "file", path: itemId, content: "" } as Item
    },
    getChildren: (itemId) => {
      const entry = editorState.filesMap.get(itemId)
      const childrenList = entry?.get("children") as
        | LoroList<string>
        | undefined
      const children = childrenList ? childrenList.toArray() : []

      return children.sort((a, b) => {
        const aType = editorState.filesMap.get(a)?.get("data") as Item
        const bType = editorState.filesMap.get(b)?.get("data") as Item

        if (aType?.type === "directory" && bType?.type !== "directory") {
          return -1
        }
        if (aType?.type !== "directory" && bType?.type === "directory") {
          return 1
        }
        return a.localeCompare(b)
      })
    }
  },
  setState: () => {
    tick().then(() => {
      render++
    })
  },
  features: [
    syncDataLoaderFeature,
    selectionFeature,
    renamingFeature,
    hotkeysCoreFeature
  ]
})

const contextMenuService = useMachine(menu.machine, {
  id: "tree-container-menu",
  onSelect: (event) => {
    const parentPath = "/"

    switch (event.value) {
      case "new-file": {
        const name = prompt("Nome do arquivo:")
        if (!name) return
        const path = `${parentPath === "/" ? "" : parentPath}/${name}`
        if (editorState.filesMap.get(path)) return alert("Arquivo já existe")
        
        const fileMap = new LoroMap<Record<string, Item>>()
        fileMap.set("data", { type: "file", path, content: "" })
        editorState.filesMap.setContainer(path, fileMap)
        addChildToParent(parentPath, path)
        editorState.loroDoc.commit()
        tree.rebuildTree()
        break
      }
      case "new-folder": {
        const name = prompt("Nome da pasta:")
        if (!name) return
        const path = `${parentPath === "/" ? "" : parentPath}/${name}`
        if (editorState.filesMap.get(path)) return alert("Pasta já existe")
        
        ensureDirectory(path)
        addChildToParent(parentPath, path)
        editorState.loroDoc.commit()
        tree.rebuildTree()
        break
      }
    }
  }
})

const contextMenuApi = $derived(
  menu.connect(contextMenuService, normalizeProps)
)

async function syncFromFs(rootFsPath: string) {
  if (!engine.current) return
  const queue: Array<{ fsPath: string; storePath: string }> = [
    { fsPath: rootFsPath, storePath: "/" }
  ]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) {
      continue
    }

    let entries: Array<{
      name: string
      isDirectory: () => boolean
      isFile: () => boolean
    }>
      try {
        entries = (await engine.current.fs.readdir(current.fsPath, {
          withFileTypes: true
        })) as typeof entries
      } catch {
        continue
      }

    for (const entry of entries) {
      const nextFsPath =
        current.fsPath === "."
          ? `./${entry.name}`
          : `${current.fsPath}/${entry.name}`
      const nextStorePath = `${current.storePath}/${entry.name}`.replaceAll(
        "//",
        "/"
      )
      if (isMatch(nextStorePath)) {
        continue
      }

      if (entry.isDirectory()) {
        ensureDirectory(nextStorePath)
        addChildToParent(current.storePath, nextStorePath)
        queue.push({ fsPath: nextFsPath, storePath: nextStorePath })
        continue
      }

      if (entry.isFile()) {
        const content = await engine.current.fs.readFile(
          nextFsPath,
          "utf-8"
        )
        const fileMap = new LoroMap<Record<string, Item>>()
        fileMap.set("data", {
          type: "file",
          path: nextStorePath,
          content
        })
        editorState.filesMap.setContainer(nextStorePath, fileMap)
        addChildToParent(current.storePath, nextStorePath)
      }
    }
  }
}

onMount(() => {
  tree.rebuildTree()

  let unsubscribeLoroWatcher: (() => void) | null = null
  let unsubscribeFsWatcher: (() => void) | null = null

  const cleanupEffect = $effect.root(() => {
    $effect(() => {
      if (unsubscribeLoroWatcher) unsubscribeLoroWatcher()
      
      unsubscribeLoroWatcher = editorState.filesMap.subscribe(({ events }) => {
        if (!engine.current) return
        for (const update of events) {
          if (update.diff.type === "map") {
            const [_, file] = update.path as ["file", string | undefined]

            if (
              file !== undefined &&
              update.diff.updated.editableContent === undefined
            ) {
              const data = update.diff.updated.data as Item

              if (data.type === "file") {
                engine.current.fs
                  .writeFile(data.path, data.content || "", "utf-8")
                  .catch()
              } else if (data.type === "directory") {
                engine.current.fs
                  .mkdir(data.path, { recursive: true })
                  .catch()
              }
            } else {
              for (const [key, value] of Object.entries(update.diff.updated)) {
                if (value === null) {
                  engine.current.fs.rm(key, { recursive: true }).catch()
                } else if (value instanceof LoroMap) {
                  const itemData = value.get("data") as Item
                  if (itemData.type === "file") {
                    engine.current.fs
                      .writeFile(itemData.path, itemData.content || "", "utf-8")
                      .catch()
                  } else if (itemData.type === "directory") {
                    engine.current.fs
                      .mkdir(itemData.path, { recursive: true })
                      .catch()
                  }
                }
              }
            }
          }
        }
        tree.rebuildTree()
      })
    })

    $effect(() => {
      if (unsubscribeFsWatcher) unsubscribeFsWatcher()

      if (engine.current && engine.current.capabilities.externalFsIngestion) {
        unsubscribeFsWatcher = engine.current.on("fs-event", async (event) => {
          if (event.type === "ready") {
            await syncFromFs(".")
            editorState.loroDoc.commit()
            tree.rebuildTree()
            return
          }
          if (!event.path || isMatch(event.path)) {
            return
          }

          if (event.type === "dir-add" || event.type === "file-add") {
            const newMap = new LoroMap<Record<string, Item>>()

            if (event.type === "file-add") {
              newMap.set("data", {
                type: "file",
                path: event.path,
                content: engine.current ? await engine.current.fs.readFile(event.path, "utf-8") : ""
              })
            } else {
              newMap.set("data", {
                type: "directory",
                path: event.path
              })
              newMap.setContainer("children", new LoroList<string>())
            }

            editorState.filesMap.setContainer(event.path, newMap)

            const parent = `/${event.path
              .split("/")
              .slice(0, -1)
              .join("/")}`.replaceAll("//", "/")
            addChildToParent(parent, event.path)
          } else if (event.type === "file-remove" || event.type === "dir-remove") {
            editorState.filesMap.delete(event.path)
            const parent = `/${event.path.split("/").slice(0, -1).join("/")}`
            const parentItem = editorState.filesMap.get(parent)

            if (parentItem) {
              const children = parentItem.get("children") as LoroList<string>
              const index = children.toArray().indexOf(event.path)
              if (index !== -1) {
                children.delete(index, 1)
              }
            }
          } else if (event.type === "file-change") {
            const item = editorState.filesMap.get(event.path)
            const content = engine.current ? await engine.current.fs.readFile(event.path, "utf-8") : ""
            if (item) {
              item.set("data", {
                type: "file",
                path: event.path,
                content
              })
            } else {
              const fileMap = new LoroMap<Record<string, Item>>()
              fileMap.set("data", {
                type: "file",
                path: event.path,
                content
              })
              editorState.filesMap.setContainer(event.path, fileMap)
              const parent = `/${event.path
                .split("/")
                .slice(0, -1)
                .join("/")}`.replaceAll("//", "/")
              addChildToParent(parent, event.path)
            }
          }

          editorState.loroDoc.commit()
          tree.rebuildTree()
        })
      }
    })
  })

  return () => {
    if (unsubscribeLoroWatcher) unsubscribeLoroWatcher()
    unsubscribeFsWatcher?.()
    cleanupEffect()
  }
})
</script>

<div
	class="h-full p-3 overflow-auto bg-base-300"
	use:registerTree
	{...tree.getContainerProps()}
  {...contextMenuApi.getContextTriggerProps()}
>
  {#key render}
    {#each tree.getItems() as item (item.getId())}
      <TreeItem item={item} />
    {/each}
  {/key}
</div>

<div {...contextMenuApi.getPositionerProps()} class="z-50">
  <ul {...contextMenuApi.getContentProps()} class="bg-base-200 shadow-xl border border-base-content/10 py-1 min-w-[160px] rounded overflow-hidden">
    <li {...contextMenuApi.getItemProps({ value: "new-file" })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm">Novo Arquivo</li>
    <li {...contextMenuApi.getItemProps({ value: "new-folder" })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm">Nova Pasta</li>
  </ul>
</div>
