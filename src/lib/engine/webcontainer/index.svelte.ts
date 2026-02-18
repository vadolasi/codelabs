import { type FileSystemTree, WebContainer } from "@webcontainer/api"
import type { LoroList } from "loro-crdt"
import editorState from "../../../components/Editor/editorState.svelte"
import BaseEngine, {
  type EngineCapabilities,
  type EngineFs
} from "../base.svelte"
import { onFsWatcherEvent } from "./fswatcher/bus"
import { startFsWatcher } from "./fswatcher/start"

export default class WebcontainerEngine extends BaseEngine {
  readonly id = "webcontainers"

  readonly capabilities: EngineCapabilities = {
    terminal: "pty",
    preview: true,
    externalFsIngestion: true,
    runnable: false,
    visualizer: false
  }

  webcontainerInstance: WebContainer | null = null
  private preparePromise: Promise<void> | null = null
  private initializePromise: Promise<void> | null = null
  stopFsWatcher: (() => void) | null = null
  private unsubscribeFsBus: (() => void) | null = null

  get fs(): EngineFs {
    if (!this.webcontainerInstance) {
      throw new Error("WebContainer instance not initialized")
    }
    return this.webcontainerInstance.fs as unknown as EngineFs
  }

  async prepare(): Promise<void> {
    if (this.preparePromise) {
      return this.preparePromise
    }

    this.preparePromise = (async () => {
      this.webcontainerInstance = await WebContainer.boot({
        workdirName: "codelabs"
      })
    })()

    return this.preparePromise
  }

  async initialize(): Promise<void> {
    if (this.initializePromise) {
      return this.initializePromise
    }

    const instance = this.webcontainerInstance
    if (!instance) {
      throw new Error("WebContainer instance not prepared")
    }

    this.initializePromise = (async () => {
      instance.on("server-ready", (port, url) => {
        this.emit("preview-open", { port, url })
      })

      instance.on("port", (port, event) => {
        if (event === "close") {
          this.emit("preview-close", { port })
        }
      })

      const fileTree = this.getFileTree()
      await instance.mount(fileTree)

      if (this.capabilities.externalFsIngestion) {
        this.stopFsWatcher = await startFsWatcher(instance, {
          rootPath: "."
        })
        this.unsubscribeFsBus = onFsWatcherEvent((event) => {
          this.emit("fs-event", event)
        })
      }

      this.readyState = "ready"
    })()

    return this.initializePromise
  }

  async close(): Promise<void> {
    this.unsubscribeFsBus?.()
    this.stopFsWatcher?.()
    this.webcontainerInstance?.teardown()
  }

  async spawnTerminal(options: { cols: number; rows: number }) {
    if (!this.webcontainerInstance) {
      throw new Error("WebContainer instance not initialized")
    }
    return this.webcontainerInstance.spawn("jsh", {
      terminal: {
        cols: options.cols,
        rows: options.rows
      }
    })
  }

  async run(): Promise<void> {}

  interrupt(): void {}

  canRun(_path: string): boolean {
    // WebContainer doesn't have a simple 'Run' button context, it uses the terminal
    return false
  }

  setVisualizerContainer(): void {}

  private getFileTree(rootPath = "/"): FileSystemTree {
    const fileTree: FileSystemTree = {}

    const rootChildren =
      (
        editorState.filesMap.get(rootPath)?.get("children") as LoroList<string>
      )?.toArray() || []

    for (const childId of rootChildren) {
      const filename = childId.split("/").pop() || ""
      const childData = editorState.filesMap.get(childId)
      if (!childData || typeof childData.get !== "function") {
        continue
      }
      const itemData = childData.get("data") as Item

      if (itemData.type === "file") {
        fileTree[filename] = {
          file: {
            contents: itemData.content
          }
        }
      } else if (itemData.type === "directory") {
        fileTree[filename] = {
          directory: this.getFileTree(itemData.path)
        }
      }
    }

    return fileTree
  }
}
