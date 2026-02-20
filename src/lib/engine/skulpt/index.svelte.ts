import editorState from "../../../components/Editor/editorState.svelte"
import BaseEngine, {
  type EngineCapabilities,
  type EngineFs,
  type EngineProcess,
  type EngineProcessChunk
} from "../base.svelte"

// biome-ignore lint/suspicious/noExplicitAny: Skulpt doesn't have types
declare const Sk: any

export default class SkulptEngine extends BaseEngine {
  readonly id = "skulpt"
  readonly capabilities: EngineCapabilities = {
    terminal: "simple",
    preview: false,
    externalFsIngestion: false,
    runnable: true,
    visualizer: true,
    dependencyManagement: false
  }

  private outputController: ReadableStreamDefaultController<EngineProcessChunk> | null =
    null
  private inputResolve: ((val: string) => void) | null = null
  private outputBuffer: string[] = []
  private visualizerContainer: HTMLElement | null = null
  private currentPath: string | null = null

  canRun(path: string): boolean {
    return path.endsWith(".py")
  }

  get fs(): EngineFs {
    return {
      readFile: async (path: string) => {
        const item = editorState.filesMap.get(path)
        if (!item) return ""

        const data = item.get("data") as any

        return data?.content || ""
      },
      writeFile: async (path: string, data: string) => {
        const item = editorState.filesMap.get(path)
        if (item) {
          item.set("data", { type: "file", path, content: data })
        }
      },
      readdir: async () => [],
      mkdir: async () => {},
      rm: async () => {},
      rename: async () => {}
    }
  }

  async prepare(): Promise<void> {
    if (typeof Sk !== "undefined") return

    return new Promise((resolve, reject) => {
      const skulpt = document.createElement("script")
      skulpt.src = "/skulpt.min.js"
      skulpt.onerror = () => reject(new Error("Falha ao carregar Skulpt"))
      skulpt.onload = () => {
        const stdlib = document.createElement("script")
        stdlib.src = "/skulpt-stdlib.js"
        stdlib.onerror = () =>
          reject(new Error("Falha ao carregar Skulpt Stdlib"))
        stdlib.onload = () => resolve()
        document.head.appendChild(stdlib)
      }
      document.head.appendChild(skulpt)
    })
  }

  async initialize(): Promise<void> {
    this.configureSkulpt()
    this.readyState = "ready"
  }

  private configureSkulpt() {
    if (typeof Sk === "undefined") return

    const resolveWorkspaceAsset = (url: string) => {
      const decodedUrl = decodeURIComponent(url)
      const cleanUrl = decodedUrl.replace(/\.gif$/, "")

      const pathsToTry = [
        decodedUrl,
        cleanUrl,
        decodedUrl.startsWith("/") ? decodedUrl : `/${decodedUrl}`,
        cleanUrl.startsWith("/") ? cleanUrl : `/${cleanUrl}`,
        // Remove / se existir para tentar caminhos relativos
        decodedUrl.replace(/^\//, ""),
        cleanUrl.replace(/^\//, "")
      ]

      for (const targetPath of pathsToTry) {
        const item = editorState.filesMap.get(targetPath)
        const data = item?.get("data") as any

        if (data) {
          if (data.type === "binary") {
            return `/api/files/${data.hash}`
          }
          if (
            data.type === "file" &&
            targetPath.toLowerCase().endsWith(".svg")
          ) {
            const blob = new Blob([data.content], { type: "image/svg+xml" })
            return URL.createObjectURL(blob)
          }
        }
      }

      return url
    }

    Sk.TurtleGraphics = Sk.TurtleGraphics || {}
    Sk.TurtleGraphics.target = "turtle-canvas"
    Sk.TurtleGraphics.assets = resolveWorkspaceAsset

    Sk.canvas = "turtle-canvas"
    Sk.imageProxy = resolveWorkspaceAsset

    Sk.configure({
      output: (text: string) => this.enqueueOutput(text),
      read: (x: string) => {
        if (
          Sk.builtinFiles !== undefined &&
          Sk.builtinFiles.files[x] !== undefined
        ) {
          return Sk.builtinFiles.files[x]
        }

        let targetPath = x.startsWith("/") ? x : `/${x}`
        targetPath = targetPath.replace(/\/\.\//g, "/").replace(/\/+/g, "/")

        const item = editorState.filesMap.get(targetPath)
        // biome-ignore lint/suspicious/noExplicitAny: Loro returns plain objects for map values
        const data = item?.get("data") as any
        const content = data?.content

        if (content !== undefined) return content

        throw `File not found: '${x}'`
      },
      inputfun: () =>
        new Promise((resolve) => {
          this.inputResolve = resolve
        }),
      python3: true,
      __future__: Sk.python3
    })

    Sk.syspath = ["."]
    if (this.currentPath) {
      const dir = this.currentPath.split("/").slice(0, -1).join("/") || "/"
      if (dir !== "/") {
        Sk.syspath.push(dir)
      }
    }
    Sk.syspath.push("/")
  }

  private enqueueOutput(text: string) {
    if (this.outputController) {
      try {
        this.outputController.enqueue(text)
      } catch {
        this.outputController = null
        this.outputBuffer.push(text)
      }
    } else {
      this.outputBuffer.push(text)
    }
  }

  setVisualizerContainer(el: HTMLElement | null): void {
    this.visualizerContainer = el
    if (el) {
      el.id = "turtle-canvas"
      if (typeof Sk !== "undefined") {
        Sk.TurtleGraphics = Sk.TurtleGraphics || {}
        Sk.TurtleGraphics.target = "turtle-canvas"
      }
    }
  }

  interrupt(): void {
    this.enqueueOutput("\nExecution interrupted.\n")
    this.isRunning = false
    this.configureSkulpt()
  }

  async run(path: string): Promise<void> {
    if (this.isRunning) return

    this.isRunning = true
    this.currentPath = path

    const code = await this.fs.readFile(path, "utf-8")

    this.outputBuffer = []
    this.enqueueOutput("\u001b[2J")

    if (this.visualizerContainer) {
      this.visualizerContainer.innerHTML = ""
      Sk.canvas = this.visualizerContainer.id || "turtle-canvas"
    }

    this.configureSkulpt()

    try {
      await Sk.misceval.asyncToPromise(() => {
        return Sk.importMainWithBody("<stdin>", false, code, true)
      })
    } catch (e) {
      this.enqueueOutput(`Erro de Execução:\n${String(e)}\n`)
      console.error("[Skulpt Error]", e)
    } finally {
      this.isRunning = false
    }
  }

  async close(): Promise<void> {
    if (this.outputController) {
      try {
        this.outputController.close()
      } catch {}
      this.outputController = null
    }
  }

  async spawnTerminal(): Promise<EngineProcess> {
    await this.close()

    const output = new ReadableStream<EngineProcessChunk>({
      start: (controller) => {
        this.outputController = controller
        while (this.outputBuffer.length > 0) {
          const chunk = this.outputBuffer.shift()
          if (chunk !== undefined) {
            controller.enqueue(chunk)
          }
        }
      }
    })

    const input = new WritableStream<EngineProcessChunk>({
      write: (chunk) => {
        if (this.inputResolve) {
          this.inputResolve(String(chunk))
          this.inputResolve = null
        }
      }
    })

    return { input, output }
  }
}
