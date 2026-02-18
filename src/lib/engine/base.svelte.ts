export type EngineCapabilities = {
  terminal: "pty" | "simple" | false
  preview: boolean
  externalFsIngestion: boolean
  runnable: boolean
  visualizer: boolean
}

export type EnginePreviewOpenEvent = {
  port: number
  url: string
}

export type EnginePreviewCloseEvent = {
  port: number
}

export type EngineFsEvent = {
  type:
    | "ready"
    | "file-add"
    | "file-change"
    | "file-remove"
    | "dir-add"
    | "dir-remove"
  path?: string
}

export type EngineEventMap = {
  "preview-open": EnginePreviewOpenEvent
  "preview-close": EnginePreviewCloseEvent
  "fs-event": EngineFsEvent
}

export type EngineProcessChunk = string | Uint8Array

export type EngineProcess = {
  input: WritableStream<EngineProcessChunk>
  output: ReadableStream<EngineProcessChunk>
  resize?: (size: { cols: number; rows: number }) => void
  kill?: () => void
  exit?: Promise<number>
}

export type EngineFsDirent = {
  name: string
  isDirectory: () => boolean
  isFile: () => boolean
}

export type EngineFs = {
  readFile: (path: string, encoding: "utf-8") => Promise<string>
  writeFile: (path: string, data: string, encoding: "utf-8") => Promise<void>
  readdir: (
    path: string,
    options: { withFileTypes: true }
  ) => Promise<EngineFsDirent[]>
  mkdir: (path: string, options: { recursive: boolean }) => Promise<void>
  rm: (path: string, options: { recursive: boolean }) => Promise<void>
  rename: (fromPath: string, toPath: string) => Promise<void>
}

type EngineListener<T> = (payload: T) => void

export type EngineReadyState = "loading" | "ready" | "error"

export default abstract class BaseEngine {
  abstract readonly id: string
  abstract readonly capabilities: EngineCapabilities
  abstract readonly fs: EngineFs
  readyState: EngineReadyState = $state("loading")
  isRunning: boolean = $state(false)

  private listeners: Partial<
    Record<keyof EngineEventMap, Set<EngineListener<unknown>>>
  > = {}

  on<K extends keyof EngineEventMap>(
    event: K,
    listener: EngineListener<EngineEventMap[K]>
  ): () => void {
    const existing = this.listeners[event]
    const set = (existing ?? new Set<EngineListener<unknown>>()) as Set<
      EngineListener<EngineEventMap[K]>
    >

    if (!existing) {
      this.listeners[event] = set as Set<EngineListener<unknown>>
    }

    set.add(listener)
    return () => {
      set.delete(listener)
    }
  }

  protected emit<K extends keyof EngineEventMap>(
    event: K,
    payload: EngineEventMap[K]
  ) {
    const set = this.listeners[event] as
      | Set<EngineListener<EngineEventMap[K]>>
      | undefined
    if (!set) {
      return
    }
    for (const listener of set) {
      listener(payload)
    }
  }

  abstract prepare(): Promise<void>

  abstract initialize(): Promise<void>

  abstract close(): Promise<void>

  abstract run?(path: string): Promise<void>

  abstract interrupt?(): void

  abstract canRun?(path: string): boolean

  abstract setVisualizerContainer?(el: HTMLElement | null): void

  spawnTerminal?(options: {
    cols: number
    rows: number
  }): Promise<EngineProcess>
}
