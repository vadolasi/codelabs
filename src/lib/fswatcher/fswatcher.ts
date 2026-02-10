import path from "node:path"
import chokidar from "chokidar"

const rootPath = resolveRootPath(process.argv[2])
const ignoreArg = process.argv[3]
const ignore = ignoreArg ? JSON.parse(ignoreArg) : []

const watcher = chokidar.watch(rootPath, {
  ignored: ignore,
  ignoreInitial: true,
  cwd: rootPath,
  awaitWriteFinish: {
    stabilityThreshold: 50,
    pollInterval: 10
  }
})

const emit = (type: string, filePath?: string) => {
  const payload = filePath ? `${type}\t${normalizePath(filePath)}` : type
  process.stdout.write(`${payload}\n`)
}

emit("ready")

watcher.on("add", (filePath) => emit("file-add", filePath))
watcher.on("change", (filePath) => emit("file-change", filePath))
watcher.on("unlink", (filePath) => emit("file-remove", filePath))
watcher.on("addDir", (filePath) => emit("dir-add", filePath))
watcher.on("unlinkDir", (filePath) => emit("dir-remove", filePath))

process.on("SIGTERM", () => shutdown())
process.on("SIGINT", () => shutdown())

function shutdown() {
  watcher.close().then(() => {
    process.exit(0)
  })
}

function resolveRootPath(value?: string) {
  const resolved = value
    ? path.isAbsolute(value)
      ? value
      : path.resolve(process.cwd(), value)
    : process.cwd()
  return resolved
}

function normalizePath(value: string) {
  return value.split(path.sep).join("/")
}
