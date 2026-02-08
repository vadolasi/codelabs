import fsWatcherScript from "$lib/fswatcher/fswatcher.bundle.cjs?raw"
import type { WebContainer, WebContainerProcess } from "@webcontainer/api"
import { emitFsWatcherEvent } from "./bus"

const DEFAULT_IGNORE = ["**/node_modules/**", "**/.git/**"]

type StartFsWatcherOptions = {
	rootPath: string
	ignore?: string[]
}

export async function startFsWatcher(
	webcontainer: WebContainer,
	options: StartFsWatcherOptions
): Promise<() => void> {
	const rootPath = options.rootPath
	const ignore = options.ignore ?? DEFAULT_IGNORE
	const hiddenPath = ".fswatcher.js"
	const targetPath = "../fswatcher.js"

	await webcontainer.fs.writeFile(hiddenPath, fsWatcherScript)

	const ignoreArg = escapeShellArg(JSON.stringify(ignore))
	const command = `mv ${hiddenPath} ${targetPath} && node ${targetPath} ${rootPath} ${ignoreArg}`

	const process = await webcontainer.spawn("jsh", ["-c", command], {
		cwd: rootPath
	})

	if ("exit" in process) {
		process.exit.then(() => {}).catch(() => {})
	}

	const stop = attachOutput(process, rootPath)

	return () => {
		stop()
		if (typeof process.kill === "function") {
			process.kill()
		}
	}
}

function attachOutput(process: WebContainerProcess, rootPath: string) {
	const decoder = new TextDecoder()
	let buffer = ""
	let active = true

	const reader = process.output.getReader()

	const readLoop = async () => {
		while (active) {
			const { value, done } = await reader.read()
			if (done) {
				break
			}
			const chunk = typeof value === "string" ? value : decoder.decode(value)
			buffer += chunk
			let index = buffer.indexOf("\n")
			while (index >= 0) {
				const line = buffer.slice(0, index).trim()
				buffer = buffer.slice(index + 1)
				if (line) {
					handleLine(line, rootPath)
				}
				index = buffer.indexOf("\n")
			}
		}
	}

	readLoop().catch(() => {})

	return () => {
		active = false
		reader.cancel().catch(() => {})
	}
}

function handleLine(line: string, rootPath: string) {
	const [type, rawPath] = line.split("\t")
	if (!type) {
		return
	}

	if (type === "ready") {
		emitFsWatcherEvent({ type: "ready" })
		return
	}

	const normalizedPath = normalizePath(rawPath, rootPath)
	if (!normalizedPath) {
		return
	}

	emitFsWatcherEvent({
		type: type as
			| "file-add"
			| "file-change"
			| "file-remove"
			| "dir-add"
			| "dir-remove",
		path: normalizedPath
	})
}

function normalizePath(rawPath: string | undefined, rootPath: string) {
	if (!rawPath) {
		return undefined
	}

	if (rawPath.startsWith("/")) {
		return rawPath
	}

	const cleanedPath = rawPath.replace(/^\.\//, "")

	if (rootPath === "." || rootPath === "./") {
		return `/${cleanedPath}`
	}

	const trimmedRoot = rootPath.endsWith("/") ? rootPath.slice(0, -1) : rootPath
	return `${trimmedRoot}/${cleanedPath}`
}

function escapeShellArg(value: string) {
	return `'${value.replace(/'/g, "'\\''")}'`
}
