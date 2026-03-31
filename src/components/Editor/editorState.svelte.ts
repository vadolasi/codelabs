import type { ItemInstance } from "@headless-tree/core"
import { Code, Eye, Info } from "@lucide/svelte"
import { zip } from "fflate"
import { EphemeralStore, LoroDoc, UndoManager } from "loro-crdt"
import { Mirror, schema } from "loro-mirror"
import type { Component } from "svelte"
import { SvelteMap, SvelteSet } from "svelte/reactivity"
import type BaseEngine from "$lib/engine/base.svelte"
import httpClient from "$lib/httpClient"
import CodeViewer from "./CodeViewer.svelte"
import BinaryViewer from "./Viewers/BinaryViewer.svelte"
import ImageViewer from "./Viewers/ImageViewer.svelte"
import MarkdownViewer from "./Viewers/MarkdownViewer.svelte"

export type ViewerInfo = {
  id: string
  label: string
  icon: Component
  component: Component
}

export type WorkspaceItemData = {
  type: "file" | "directory" | "binary"
  path: string
  content?: string
  hash?: string
  size?: number
  mimeType?: string
}

type WorkspaceMirrorFile = {
  data: WorkspaceItemData
  children: string[]
  editableContent: string
}

type WorkspaceMirrorState = {
  files: Record<string, WorkspaceMirrorFile>
}

export const workspaceSchema = schema({
  files: schema.LoroMapRecord(
    schema.LoroMap({
      data: schema.Any<WorkspaceItemData>(),
      children: schema.LoroMovableList(schema.String(), (t) => t),
      editableContent: schema.LoroText()
    })
  )
})

class EditorState {
  public currentTab: string | null = $state(null)
  public tabs: ItemInstance<Item>[] = $state([])
  public creatingItem = $state<{
    parentPath: string
    type: "file" | "folder"
  } | null>(null)
  public dragOverPath = $state<string | null>(null)
  public preferredViewers = new SvelteMap<string, string>()
  public unsavedPaths = new SvelteSet<string>()
  private states: Map<string, object> = new Map()
  private tabHistory: string[] = []
  private prewviewers: SvelteMap<number, string> = new SvelteMap()
  username: string | null = $state(null)

  // Instâncias dinâmicas do Loro
  public loroDoc = $state(this.createDoc())
  public mirror: Mirror<typeof workspaceSchema>
  public state = $state<WorkspaceMirrorState>({ files: {} })

  public ephemeralStore = $state(new EphemeralStore())
  public undoManager = $state(new UndoManager(this.loroDoc, {}))

  constructor() {
    this.mirror = this.createMirror()
  }

  private createMirror() {
    const mirror = new Mirror({
      doc: this.loroDoc,
      schema: workspaceSchema,
      initialState: { files: {} }
    })

    mirror.subscribe((state) => {
      this.state = state as WorkspaceMirrorState
    })

    return mirror
  }

  private createDoc() {
    const doc = new LoroDoc()
    // PeerID único é essencial para sincronização
    doc.setPeerId(BigInt(Math.floor(Math.random() * 1000000000)))
    return doc
  }

  public reset() {
    this.currentTab = null
    this.tabs = []
    this.states.clear()
    this.tabHistory = []
    this.prewviewers.clear()
    this.preferredViewers.clear()
    this.unsavedPaths.clear()
    this.dragOverPath = null

    // Recriamos as instâncias do Loro com novas identidades
    this.loroDoc = this.createDoc()
    this.mirror = this.createMirror()
    this.ephemeralStore = new EphemeralStore()
    this.undoManager = new UndoManager(this.loroDoc, {})
  }

  public setCurrentTab(item: ItemInstance<Item>) {
    const path = item.getItemData().path
    if (!this.tabs.find((tab) => tab.getItemData().path === path)) {
      this.tabs.push(item)
    }
    this.currentTab = path
    this.tabHistory.push(path)
  }

  public closeTab(path: string) {
    this.tabs = this.tabs.filter((t) => t.getItemData().path !== path)
    this.tabHistory = this.tabHistory.filter((t) => t !== path)
    this.states.delete(path)
    this.unsavedPaths.delete(path)
    if (this.currentTab === path) {
      this.currentTab = this.tabHistory[this.tabHistory.length - 1] || null
    }
  }

  public get previousTab() {
    return this.tabHistory[this.tabHistory.length - 2] || null
  }

  public saveState(path: string, state: object) {
    this.states.set(path, state)
  }

  public getState(path: string) {
    return this.states.get(path)
  }

  public clearState(path: string) {
    this.states.delete(path)
  }

  public addPreviewer(port: number, url: string) {
    this.prewviewers.set(port, url)
  }

  public removePreviewer(port: number) {
    this.prewviewers.delete(port)
  }

  public get hasPreviewers() {
    return this.prewviewers.size > 0
  }

  public get previewers() {
    return Array.from(this.prewviewers.entries()).map(([port, url]) => ({
      port,
      url
    }))
  }

  public get activeData() {
    if (!this.currentTab) return null
    return this.state.files[this.currentTab]?.data
  }

  public get availableViewers() {
    const data = this.activeData
    if (!data) return []
    const path = data.path.toLowerCase()
    const viewers: ViewerInfo[] = []

    if (data.type === "file") {
      if (path.endsWith(".md")) {
        viewers.push({
          id: "markdown",
          label: "Visualizar",
          icon: Eye,
          component: MarkdownViewer
        })
      }
      if (path.endsWith(".svg")) {
        viewers.push({
          id: "image",
          label: "Visualizar",
          icon: Eye,
          component: ImageViewer
        })
      }
      viewers.push({
        id: "code",
        label: "Código",
        icon: Code,
        component: CodeViewer
      })
    } else if (data.type === "binary") {
      if (data.mimeType?.startsWith("image/")) {
        viewers.push({
          id: "image",
          label: "Imagem",
          icon: Eye,
          component: ImageViewer
        })
      }
      viewers.push({
        id: "binary",
        label: "Informações",
        icon: Info,
        component: BinaryViewer
      })
    }

    return viewers
  }

  public get viewerType() {
    const viewers = this.availableViewers
    if (viewers.length === 0) return "none"
    if (!this.currentTab) return viewers[0].id

    const path = this.currentTab
    const preferred = this.preferredViewers.get(path)

    if (preferred && viewers.some((v) => v.id === preferred)) {
      return preferred
    }

    return viewers[0].id
  }

  private isBlobLike(value: unknown): value is Blob {
    return !!value && typeof (value as Blob).arrayBuffer === "function"
  }

  private toArrayBuffer(data: Uint8Array): ArrayBuffer {
    return data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    ) as ArrayBuffer
  }

  public get isUnsaved() {
    if (!this.currentTab) return false
    return this.unsavedPaths.has(this.currentTab)
  }

  public setPreferredViewer(id: string) {
    if (this.currentTab) {
      this.preferredViewers.set(this.currentTab, id)
    }
  }

  public ensureDirectory(path: string) {
    if (this.state.files[path]) return

    this.mirror.setState((s) => {
      s.files[path] = {
        data: { type: "directory", path },
        children: [],
        editableContent: ""
      }
    })
  }

  public addChildToParent(parentPath: string, childPath: string) {
    this.ensureDirectory(parentPath)
    this.mirror.setState((s) => {
      const parent = s.files[parentPath]
      if (parent && parent.children.indexOf(childPath) === -1) {
        parent.children.splice(parent.children.length, 0, childPath)
      }
    })
  }

  public createFile(parentPath: string, name: string, content = "") {
    const path = `${parentPath === "/" ? "" : parentPath}/${name}`
    if (this.state.files[path]) return null

    this.mirror.setState((s) => {
      s.files[path] = {
        data: { type: "file", path, content },
        children: [],
        editableContent: content
      }

      const parent = s.files[parentPath]
      if (parent && parent.children.indexOf(path) === -1) {
        parent.children.splice(parent.children.length, 0, path)
      }
    })

    this.loroDoc.commit()
    return path
  }

  public createFolder(parentPath: string, name: string) {
    const path = `${parentPath === "/" ? "" : parentPath}/${name}`
    if (this.state.files[path]) return null

    this.mirror.setState((s) => {
      s.files[path] = {
        data: { type: "directory", path },
        children: [],
        editableContent: ""
      }

      const parent = s.files[parentPath]
      if (parent && parent.children.indexOf(path) === -1) {
        parent.children.splice(parent.children.length, 0, path)
      }
    })

    this.loroDoc.commit()
    return path
  }

  public async renameItem(oldPath: string, newName: string) {
    if (!engine.current) return
    const parentPath = oldPath.split("/").slice(0, -1).join("/") || "/"
    const newPath = `${parentPath === "/" ? "" : parentPath}/${newName}`

    if (this.state.files[newPath]) return

    await engine.current.fs.rename(oldPath, newPath)
    // The engine's fs event will trigger the Loro update if capabilities.externalFsIngestion is true
    // Otherwise we need to manually update Loro.
    // For now, let's assume the engine handles it or we'll need to refactor the watcher logic.
  }

  public deleteItem(path: string) {
    this.mirror.setState((s) => {
      delete s.files[path]
      const parent = `/${path.split("/").slice(0, -1).join("/")}`.replaceAll(
        "//",
        "/"
      )
      const parentItem = s.files[parent]
      if (parentItem) {
        const index = parentItem.children.indexOf(path)
        if (index !== -1) {
          parentItem.children.splice(index, 1)
        }
      }
    })
    this.loroDoc.commit()
  }

  public duplicateItem(path: string) {
    const item = this.state.files[path]
    const data = item?.data
    if (!data) return

    const name = data.path.split("/").pop() || ""
    const parentPath = data.path.split("/").slice(0, -1).join("/") || "/"
    const newName = `${name}_copy`

    this.copyItemRecursive(path, parentPath, newName)
    this.loroDoc.commit()
  }

  private copyItemRecursive(
    oldPath: string,
    newParentPath: string,
    newName: string
  ) {
    const item = this.state.files[oldPath]
    const data = item?.data
    if (!data) return

    const newPath = `${newParentPath === "/" ? "" : newParentPath}/${newName}`

    if (data.type === "file") {
      this.createFile(newParentPath, newName, data.content)
    } else if (data.type === "binary") {
      this.mirror.setState((s) => {
        s.files[newPath] = {
          data: { ...data, path: newPath },
          children: [],
          editableContent: ""
        }

        const parent = s.files[newParentPath]
        if (parent && parent.children.indexOf(newPath) === -1) {
          parent.children.splice(parent.children.length, 0, newPath)
        }
      })
    } else if (data.type === "directory") {
      this.createFolder(newParentPath, newName)
      const children = item.children
      if (children) {
        for (const childPath of children) {
          const childName = childPath.split("/").pop() || ""
          this.copyItemRecursive(childPath, newPath, childName)
        }
      }
    }
  }

  public async downloadWorkspace() {
    const files: Record<string, Uint8Array> = {}

    for (const [_, item] of Object.entries(this.state.files)) {
      const data = item?.data
      if (data.type === "file") {
        files[data.path.startsWith("/") ? data.path.slice(1) : data.path] =
          new TextEncoder().encode(data.content ?? "")
      } else if (data.type === "binary" && data.hash) {
        const { data: blob } = await httpClient.files({ hash: data.hash }).get()
        if (this.isBlobLike(blob)) {
          files[data.path.startsWith("/") ? data.path.slice(1) : data.path] =
            new Uint8Array(await blob.arrayBuffer())
        }
      }
    }

    zip(files, (err, data) => {
      if (err) throw err
      const blob = new Blob([this.toArrayBuffer(data)], {
        type: "application/zip"
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "workspace.zip"
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  public async downloadItem(path: string) {
    const item = this.state.files[path]
    const data = item?.data
    if (!data) return

    if (data.type === "file") {
      const blob = new Blob([data.content ?? ""], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = path.split("/").pop() || "file"
      a.click()
      URL.revokeObjectURL(url)
    } else if (data.type === "binary") {
      if (!data.hash) return
      const a = document.createElement("a")
      a.href = `/api/files/${data.hash}`
      a.download = path.split("/").pop() || "file"
      a.click()
    } else if (data.type === "directory") {
      const folderFiles: Record<string, Uint8Array> = {}
      const prefix = path.endsWith("/") ? path : `${path}/`

      for (const [filePath, fileItem] of Object.entries(this.state.files)) {
        if (filePath.startsWith(prefix)) {
          const fileData = fileItem.data
          const relativePath = filePath.slice(prefix.length)

          if (fileData.type === "file") {
            folderFiles[relativePath] = new TextEncoder().encode(
              fileData.content ?? ""
            )
          } else if (fileData.type === "binary" && fileData.hash) {
            const { data: blob } = await httpClient
              .files({ hash: fileData.hash })
              .get()
            if (this.isBlobLike(blob)) {
              folderFiles[relativePath] = new Uint8Array(
                await blob.arrayBuffer()
              )
            }
          }
        }
      }

      zip(folderFiles, (err, data) => {
        if (err) throw err
        const blob = new Blob([this.toArrayBuffer(data)], {
          type: "application/zip"
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${path.split("/").pop() || "folder"}.zip`
        a.click()
        URL.revokeObjectURL(url)
      })
    }
  }

  public async uploadFile(file: File, parentPath: string) {
    const isBinary = await this.isBinary(file)
    const path = `${parentPath === "/" ? "" : parentPath}/${file.name}`

    if (isBinary) {
      const arrayBuffer = await file.arrayBuffer()
      const hash = await this.calculateHash(arrayBuffer)

      const formData = new FormData()
      formData.append(
        "file",
        new Blob([arrayBuffer], { type: file.type }),
        file.name
      )
      formData.append("hash", hash)

      try {
        await fetch("/api/files", {
          method: "POST",
          body: formData
        })
      } catch {
        throw new Error("Failed to upload binary file")
      }

      this.mirror.setState((s) => {
        s.files[path] = {
          data: {
            type: "binary",
            path,
            hash,
            size: file.size,
            mimeType: file.type
          },
          children: [],
          editableContent: ""
        }

        const parent = s.files[parentPath]
        if (parent && parent.children.indexOf(path) === -1) {
          parent.children.splice(parent.children.length, 0, path)
        }
      })
    } else {
      const content = await file.text()
      this.mirror.setState((s) => {
        s.files[path] = {
          data: { type: "file", path, content },
          children: [],
          editableContent: content
        }

        const parent = s.files[parentPath]
        if (parent && parent.children.indexOf(path) === -1) {
          parent.children.splice(parent.children.length, 0, path)
        }
      })
    }

    this.loroDoc.commit()
  }

  private async isBinary(file: File): Promise<boolean> {
    // Basic heuristic: check for null bytes in the first 8KB
    const chunk = await file.slice(0, 8192).arrayBuffer()
    const bytes = new Uint8Array(chunk)
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === 0) return true
    }
    return false
  }

  private async calculateHash(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  }
}

const editorState = new EditorState()
export const engine: { current: BaseEngine | null } = $state({ current: null })

export default editorState
