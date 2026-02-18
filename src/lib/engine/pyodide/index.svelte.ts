import { loadPyodide, type PyodideInterface } from "pyodide"
import editorState from "../../../components/Editor/editorState.svelte"
import BaseEngine, {
  type EngineCapabilities,
  type EngineFs,
  type EngineProcess,
  type EngineProcessChunk
} from "../base.svelte"

export default class PyodideEngine extends BaseEngine {
  readonly id = "pyodide"
  readonly capabilities: EngineCapabilities = {
    terminal: "simple",
    preview: false,
    externalFsIngestion: false,
    runnable: true,
    visualizer: false,
    dependencyManagement: true
  }

  private pyodide: PyodideInterface | null = null
  private outputController: ReadableStreamDefaultController<EngineProcessChunk> | null =
    null
  private inputResolve: ((val: string) => void) | null = null
  private outputBuffer: string[] = []

  canRun(path: string): boolean {
    return path.endsWith(".py")
  }

  get fs(): EngineFs {
    return {
      readFile: async (path: string) => {
        const item = editorState.filesMap.get(path)
        // biome-ignore lint/suspicious/noExplicitAny: Loro returns plain objects for map values
        const data = item?.get("data") as any
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
    if (this.pyodide) return

    this.pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.3/full/"
    })
  }

  async initialize(): Promise<void> {
    if (!this.pyodide) return

    this.pyodide.setStdout({
      batched: (text: string) => this.enqueueOutput(text)
    })
    this.pyodide.setStderr({
      batched: (text: string) => this.enqueueOutput(text)
    })

    await this.pyodide.loadPackage("micropip")
    this.readyState = "ready"
  }

  private enqueueOutput(text: string) {
    const output = `${text}
`
    if (this.outputController) {
      try {
        this.outputController.enqueue(output)
      } catch {
        this.outputController = null
        this.outputBuffer.push(output)
      }
    } else {
      this.outputBuffer.push(output)
    }
  }

  async run(path: string): Promise<void> {
    if (this.isRunning || !this.pyodide) return

    this.isRunning = true
    const code = await this.fs.readFile(path, "utf-8")

    this.outputBuffer = []
    this.enqueueOutput("\u001b[2J")
    this.enqueueOutput(`Running ${path} (Pyodide)...
`)

    try {
      // Sync files to Pyodide MEMFS
      this.syncFilesToPyodide()

      // Automatically load packages used in the code
      await this.pyodide.loadPackagesFromImports(code)

      await this.pyodide.runPythonAsync(code)

      if (this.isRunning) {
        this.enqueueOutput("Process finished.")
      }
    } catch (e) {
      this.enqueueOutput(`
${String(e)}
`)
    } finally {
      this.isRunning = false
    }
  }

  private syncFilesToPyodide() {
    if (!this.pyodide) return

    for (const [path, item] of editorState.filesMap.entries()) {
      // biome-ignore lint/suspicious/noExplicitAny: Loro returns plain objects
      const data = item?.get("data") as any
      if (data?.type === "file") {
        const dir = path.split("/").slice(0, -1).join("/")
        if (dir && dir !== "/") {
          try {
            this.pyodide.FS.mkdirTree(dir)
          } catch {}
        }
        this.pyodide.FS.writeFile(path, data.content, { encoding: "utf8" })
      }
    }
  }

  interrupt(): void {
    this.enqueueOutput("\nExecution interrupted.\n")

    this.isRunning = false
    // Pyodide doesn't have a simple interrupt on main thread without SharedArrayBuffer
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
      write: (_chunk) => {
        // Input handling in Pyodide on main thread is tricky
        // For now, we don't have a clean way to handle blocking input()
      }
    })

    return { input, output }
  }
}
