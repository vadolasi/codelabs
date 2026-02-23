<script lang="ts">
import type { ItemInstance } from "@headless-tree/core"
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
import { onMount } from "svelte"
import resolveIcon from "$lib/icons"
import editorState, {
  engine, 
} from "../editorState.svelte"
import TreeItem from "./TreeItem.svelte"

const creatingItem = $derived(editorState.creatingItem)

const tree = createTree<Item>({
  rootItemId: "/",
  initialState: {
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
      const entry = editorState.state.files[itemId]
      if (entry) {
        return entry.data
      }
      if (itemId === "/") {
        editorState.ensureDirectory("/")
        return editorState.state.files["/"]?.data
      }
      return { type: "file", path: itemId, content: "" } as Item
    },
    getChildren: (itemId) => {
      const entry = editorState.state.files[itemId]
      const children = entry?.children || []

      return children.sort((a, b) => {
        const aType = editorState.state.files[a]?.data
        const bType = editorState.state.files[b]?.data

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
  features: [
    syncDataLoaderFeature,
    selectionFeature,
    renamingFeature,
    hotkeysCoreFeature
  ]
})

let treeState = $state(tree.getState())

$effect.pre(() => {
  tree.setConfig((prev) => ({
    ...prev,
    state: treeState,
    setState: (newState) => {
      treeState = typeof newState === 'function' ? (newState as any)(treeState) : newState
    }
  }))
})

const items = $derived.by(() => {
  treeState
  return tree.getItems()
})

const creatingItemIcon = $derived.by(() => {
  if (!creatingItem) return ""
  return resolveIcon(creatingItem.type === 'file' ? 'f.txt' : 'folder', creatingItem.type === 'file' ? 'file' : 'folder-closed')
})

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

const contextMenuService = useMachine(menu.machine, {
  id: "tree-container-menu",
  onSelect: (event) => {
    let parentPath = "/"
    
    let targetItem: ItemInstance<Item> | null = null
    const selectedItemIds = tree.getState().selectedItems

    if (selectedItemIds.length === 1) {
      targetItem = tree.getItemInstance(selectedItemIds[0])
    }
    
    if (targetItem) {
      if (targetItem.getId() === "/") {
        parentPath = "/"
      } else {
        const data = targetItem.getItemData()
        if (data.type === "directory") {
          parentPath = targetItem.getId()
          targetItem.expand()
        } else {
          const parent = targetItem.getParent()
          parentPath = parent?.getId() || "/"
          parent?.expand()
        }
      }
      tree.rebuildTree()
    } else {
      parentPath = "/"
    }

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
const contextTriggerProps = $derived(contextMenuApi.getContextTriggerProps())

let dragCounter = 0

function handleDragEnter(e: DragEvent) {
  e.preventDefault()
  dragCounter++
  if (dragCounter === 1 && !editorState.dragOverPath) {
    editorState.dragOverPath = "/"
  }
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  dragCounter--
  if (dragCounter === 0) {
    editorState.dragOverPath = null
  }
}

async function handleDrop(e: DragEvent) {
  e.preventDefault()
  dragCounter = 0
  
  const items = e.dataTransfer?.items
  if (!items) return

  const targetPath = editorState.dragOverPath || "/"
  editorState.dragOverPath = null

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
        editorState.mirror.setState((s) => {
          s.files[nextStorePath] = {
            data: {
              type: "file",
              path: nextStorePath,
              content: fileContent
            },
            children: [],
            editableContent: fileContent
          }
        })
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
      
      unsubscribeLoroWatcher = editorState.loroDoc.subscribe(({ events }) => {
        if (!engine.current) return
        for (const update of events) {
          if (update.diff.type === "map" && update.path[0] === "files") {
            const file = update.path[1] as string | undefined

            if (
              file !== undefined &&
              update.diff.updated.editableContent === undefined
            ) {
              const data = update.diff.updated.data as Item

              if (data?.type === "file") {
                engine.current.fs
                  .writeFile(data.path, data.content || "", "utf-8")
                  .catch()
              } else if (data?.type === "directory") {
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
                  if (itemData?.type === "file") {
                    engine.current.fs
                      .writeFile(itemData.path, itemData.content || "", "utf-8")
                      .catch()
                  } else if (itemData?.type === "directory") {
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
            editorState.mirror.setState((s) => {
              if (event.type === "file-add") {
                const content = engine.current ? engine.current.fs.readFile(event.path, "utf-8") : Promise.resolve("")
                // Note: we can't await inside setState, so we might need a different approach if content is needed immediately.
                // But usually file-add from watcher is followed by file-change or we can read it before.
                // For now, let's keep it simple or assume it's handled.
                // Actually, let's read it before.
              }
            })
            
            if (event.type === "file-add") {
              const content = engine.current ? await engine.current.fs.readFile(event.path, "utf-8") : ""
              editorState.mirror.setState((s) => {
                s.files[event.path] = {
                  data: { type: "file", path: event.path, content },
                  children: [],
                  editableContent: content
                }
              })
            } else {
              editorState.mirror.setState((s) => {
                s.files[event.path] = {
                  data: { type: "directory", path: event.path },
                  children: [],
                  editableContent: ""
                }
              })
            }

            const parent = `/${event.path
              .split("/")
              .slice(0, -1)
              .join("/")}`.replaceAll("//", "/")
            editorState.addChildToParent(parent, event.path)
          } else if (event.type === "file-remove" || event.type === "dir-remove") {
            editorState.deleteItem(event.path)
          } else if (event.type === "file-change") {
            const content = engine.current ? await engine.current.fs.readFile(event.path, "utf-8") : ""
            editorState.mirror.setState((s) => {
              const item = s.files[event.path]
              if (item) {
                item.data.content = content
                item.editableContent = content
              } else {
                s.files[event.path] = {
                  data: { type: "file", path: event.path, content },
                  children: [],
                  editableContent: content
                }
              }
            })
            const parent = `/${event.path
              .split("/")
              .slice(0, -1)
              .join("/")}`.replaceAll("//", "/")
            editorState.addChildToParent(parent, event.path)
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
  {...contextTriggerProps}
  ondragenter={handleDragEnter}
  ondragover={(e) => e.preventDefault()}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  {#if creatingItem && (creatingItem.parentPath === '/' || creatingItem.parentPath === '')}
    <div class="flex items-center gap-1 px-1 mb-1" style:padding-left="0px">
      <img src={creatingItemIcon} alt="" class="w-4 h-4 shrink-0" />
      <input 
        autofocus
        class="border border-primary bg-base-100 rounded px-1 w-full outline-none text-sm"
        onkeydown={(e) => {
          if (e.key === 'Escape') {
            editorState.creatingItem = null
            tree.rebuildTree()
          }
          if (e.key === 'Enter') {
            const name = e.currentTarget.value
            if (name) {
              if (creatingItem?.type === 'file') editorState.createFile(creatingItem.parentPath, name)
              else if (creatingItem?.type === 'folder') editorState.createFolder(creatingItem.parentPath, name)
            }
            editorState.creatingItem = null
            tree.rebuildTree()
          }
        }}
        onblur={() => { editorState.creatingItem = null; tree.rebuildTree(); }}
      />
    </div>
  {/if}
  {#each items as item (item.getId())}
    <TreeItem {item} {tree} treeState={treeState} />
    {#if creatingItem && (creatingItem.parentPath === item.getId() || (item.getItemData().type === 'directory' && creatingItem.parentPath === item.getItemData().path))}
      <div class="flex items-center gap-1 px-1" style:padding-left={`${(item.getItemMeta().level + 1) * 10}px`}>
        <img src={creatingItemIcon} alt="" class="w-4 h-4 shrink-0" />
        <input 
          autofocus
          class="border border-primary bg-base-100 rounded px-1 w-full outline-none text-sm"
          onkeydown={(e) => {
            if (e.key === 'Escape') {
              editorState.creatingItem = null
              tree.rebuildTree()
            }
            if (e.key === 'Enter') {
              const name = e.currentTarget.value
              if (name) {
                if (creatingItem?.type === 'file') editorState.createFile(creatingItem.parentPath, name)
                else if (creatingItem?.type === 'folder') editorState.createFolder(creatingItem.parentPath, name)
              }
              editorState.creatingItem = null
              tree.rebuildTree()
            }
          }}
          onblur={() => { editorState.creatingItem = null; tree.rebuildTree(); }}
        />
      </div>
    {/if}
  {/each}
</div>

<div {...contextMenuApi.getPositionerProps()} class="z-50">
  <ul {...contextMenuApi.getContentProps()} class="bg-base-200 shadow-xl border border-base-content/10 py-1 min-w-[160px] rounded overflow-hidden">
    <li {...contextMenuApi.getItemProps({ value: "new-file" })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm">Novo Arquivo</li>
    <li {...contextMenuApi.getItemProps({ value: "new-folder" })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm">Nova Pasta</li>
    <div class="border-t border-base-content/5 my-1"></div>
    <li {...contextMenuApi.getItemProps({ value: "download-zip" })} class="cursor-pointer py-1.5 px-4 hover:bg-primary hover:text-primary-content text-sm">Baixar como ZIP</li>
  </ul>
</div>
