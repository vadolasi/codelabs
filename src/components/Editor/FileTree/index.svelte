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
import resolveIcon from "$lib/icons"
import editorState, {
  engine, 
} from "../editorState.svelte"
import TreeItem from "./TreeItem.svelte"

let render = $state(0)

const isMatch = picoMatch("**/node_modules/**", { dot: true })

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

editorState.ensureDirectory("/")

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
    await editorState.renameItem(item.getItemData().path, newName)
  },
  dataLoader: {
    getItem: (itemId) => {
      const entry = editorState.filesMap.get(itemId)
      if (entry) {
        return entry.get("data") as Item
      }
      if (itemId === "/") {
        return editorState.ensureDirectory("/").get("data") as Item
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
        editorState.creatingItem = { parentPath, type: 'file' }
        break
      }
      case "new-folder": {
        editorState.creatingItem = { parentPath, type: 'folder' }
        break
      }
      case "download-zip": {
        editorState.downloadWorkspace()
        break
      }
    }
  }
})

const contextMenuApi = $derived(
  menu.connect(contextMenuService, normalizeProps)
)

let dragOverPath = $state<string | null>(null)
let dragOverTimer: Timer | null = null

async function handleDrop(e: DragEvent) {
  e.preventDefault()
  dragOverPath = null
  
  const items = e.dataTransfer?.items
  if (!items) return

  const targetPath = dragOverPath || "/"

  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry()
    if (entry) {
      await uploadEntry(entry, targetPath)
    }
  }
}

async function uploadEntry(entry: FileSystemEntry, parentPath: string) {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve) => (entry as FileSystemFileEntry).file(resolve))
    await editorState.uploadFile(file, parentPath)
  } else if (entry.isDirectory) {
    const newDirPath = editorState.createFolder(parentPath, entry.name)
    if (!newDirPath) return
    
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    const entries = await new Promise<FileSystemEntry[]>((resolve) => reader.readEntries(resolve))
    for (const childEntry of entries) {
      await uploadEntry(childEntry, newDirPath)
    }
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  // Logic for hover auto-open could be added here by detecting which TreeItem is under the mouse
}

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
        editorState.ensureDirectory(nextStorePath)
        editorState.addChildToParent(current.storePath, nextStorePath)
        queue.push({ fsPath: nextFsPath, storePath: nextStorePath })
        continue
      }

      if (entry.isFile()) {
        const fileContent = await engine.current.fs.readFile(nextFsPath, "utf-8")
        // For syncFromFs, we assume it's mostly text files for now 
        // as Skulpt/Pyodide usually deal with text. 
        // But a more robust sync would check binary.
        const fileMap = new LoroMap<Record<string, Item>>()
        fileMap.set("data", {
          type: "file",
          path: nextStorePath,
          content: fileContent
        })
        editorState.filesMap.setContainer(nextStorePath, fileMap)
        editorState.addChildToParent(current.storePath, nextStorePath)
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
            editorState.addChildToParent(parent, event.path)
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
              editorState.addChildToParent(parent, event.path)
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
  ondragover={handleDragOver}
  ondrop={handleDrop}
>
  {#if editorState.creatingItem && editorState.creatingItem.parentPath === '/'}
    <div class="flex items-center gap-1 px-1 mb-1" style:padding-left="0px">
      <img src={resolveIcon(editorState.creatingItem.type === 'file' ? 'f.txt' : 'folder', editorState.creatingItem.type === 'file' ? 'file' : 'folder-closed')} alt="" class="w-4 h-4 shrink-0" />
      <input 
        autofocus
        class="border border-primary bg-base-100 rounded px-1 w-full outline-none text-sm"
        onkeydown={(e) => {
          if (e.key === 'Escape') editorState.creatingItem = null
          if (e.key === 'Enter') {
            const name = e.currentTarget.value
            if (name) {
              if (editorState.creatingItem?.type === 'file') editorState.createFile(editorState.creatingItem.parentPath, name)
              else if (editorState.creatingItem?.type === 'folder') editorState.createFolder(editorState.creatingItem.parentPath, name)
            }
            editorState.creatingItem = null
            tree.rebuildTree()
          }
        }}
        onblur={() => editorState.creatingItem = null}
      />
    </div>
  {/if}
  {#key render}
    {#each tree.getItems() as item (item.getId())}
      <TreeItem item={item} />
      {#if editorState.creatingItem && editorState.creatingItem.parentPath === item.getItemData().path && item.isExpanded()}
        <div class="flex items-center gap-1 px-1" style:padding-left={`${(item.getItemMeta().level + 1) * 10}px`}>
          <img src={resolveIcon(editorState.creatingItem.type === 'file' ? 'f.txt' : 'folder', editorState.creatingItem.type === 'file' ? 'file' : 'folder-closed')} alt="" class="w-4 h-4 shrink-0" />
          <input 
            autofocus
            class="border border-primary bg-base-100 rounded px-1 w-full outline-none text-sm"
            onkeydown={(e) => {
              if (e.key === 'Escape') editorState.creatingItem = null
              if (e.key === 'Enter') {
                const name = e.currentTarget.value
                if (name) {
                  if (editorState.creatingItem?.type === 'file') editorState.createFile(editorState.creatingItem.parentPath, name)
                  else if (editorState.creatingItem?.type === 'folder') editorState.createFolder(editorState.creatingItem.parentPath, name)
                }
                editorState.creatingItem = null
                tree.rebuildTree()
              }
            }}
            onblur={() => editorState.creatingItem = null}
          />
        </div>
      {/if}
    {/each}
  {/key}
</div>

<div {...contextMenuApi.getPositionerProps()} class="z-50">
  <ul {...contextMenuApi.getContentProps()} class="bg-base-200 shadow-xl border border-base-content/10 py-1 min-w-[160px] rounded overflow-hidden">
    <li {...contextMenuApi.getItemProps({ value: "new-file" })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm">Novo Arquivo</li>
    <li {...contextMenuApi.getItemProps({ value: "new-folder" })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm">Nova Pasta</li>
    <div class="border-t border-base-content/5 my-1"></div>
    <li {...contextMenuApi.getItemProps({ value: "download-zip" })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm">Baixar como ZIP</li>
  </ul>
</div>
