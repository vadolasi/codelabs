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
    visualizer: true
  }

  private outputController: ReadableStreamDefaultController<EngineProcessChunk> | null =
    null
  private inputResolve: ((val: string) => void) | null = null
  private outputBuffer: string[] = []
  private visualizerContainer: HTMLElement | null = null

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
      readdir: async () => [], // Skulpt doesn't have a real FS readdir
      mkdir: async () => {},
      rm: async () => {},
      rename: async () => {}
    }
  }

  async prepare(): Promise<void> {
    if (typeof Sk !== "undefined") return

    return new Promise((resolve, reject) => {
      const jquery = document.createElement("script")
      jquery.src =
        "https://ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.min.js"
      jquery.crossOrigin = "anonymous"
      jquery.onerror = () => reject(new Error("Falha ao carregar jQuery"))
      jquery.onload = () => {
        const skulpt = document.createElement("script")
        skulpt.src =
          "https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt.min.js"
        skulpt.crossOrigin = "anonymous"
        skulpt.onerror = () => reject(new Error("Falha ao carregar Skulpt"))
        skulpt.onload = () => {
          const stdlib = document.createElement("script")
          stdlib.src =
            "https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt-stdlib.js"
          stdlib.crossOrigin = "anonymous"
          stdlib.onerror = () =>
            reject(new Error("Falha ao carregar Skulpt Stdlib"))
          stdlib.onload = () => resolve()
          document.head.appendChild(stdlib)
        }
        document.head.appendChild(skulpt)
      }
      document.head.appendChild(jquery)
    })
  }

  async initialize(): Promise<void> {
    this.configureSkulpt()
    this.readyState = "ready"
  }

  private configureSkulpt() {
    if (typeof Sk === "undefined") return

    Sk.configure({
      output: (text: string) => this.enqueueOutput(text),
      read: (x: string) => {
        if (
          Sk.builtinFiles === undefined ||
          Sk.builtinFiles.files[x] === undefined
        ) {
          const path = x.startsWith("/") ? x : `/${x}`
          const item = editorState.filesMap.get(path)
          // biome-ignore lint/suspicious/noExplicitAny: Loro returns plain objects for map values
          const data = item?.get("data") as any
          const content = data?.content
          if (content !== undefined) return content
          throw `File not found: '${x}'`
        }
        return Sk.builtinFiles.files[x]
      },
      inputfun: () =>
        new Promise((resolve) => {
          // Removemos o log de "Input:" e códigos ANSI para manter a tela limpa
          this.inputResolve = resolve
        }),
      python3: true,
      __future__: Sk.python3
    })

    // Configuração do Turtle - seguindo padrão Skulpt.org
    Sk.TurtleGraphics = Sk.TurtleGraphics || {}
    Sk.TurtleGraphics.target = "turtle-canvas"
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
    // Skulpt doesn't have a built-in kill, but we can reset the state
    this.enqueueOutput("\nExecution interrupted.\n")
    this.isRunning = false
    // Force reset Skulpt context
    this.configureSkulpt()
  }

  async run(path: string): Promise<void> {
    if (this.isRunning) return

    this.isRunning = true
    const code = await this.fs.readFile(path, "utf-8")

    // Resetamos o buffer e enviamos o sinal de limpeza explicitamente
    this.outputBuffer = []
    this.enqueueOutput("\u001b[2J")

    if (this.visualizerContainer) {
      this.visualizerContainer.innerHTML = ""
    }

    this.configureSkulpt()

    this.enqueueOutput(`Running ${path}...\n`)

    try {
      // Skulpt importMainWithBody já lida com a execução
      await Sk.misceval.asyncToPromise(() => {
        return Sk.importMainWithBody("<stdin>", false, code, true)
      })
      if (this.isRunning) {
        this.enqueueOutput("\nProcess finished.\n")
      }
    } catch (e) {
      this.enqueueOutput(`\n${String(e)}\n`)
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
