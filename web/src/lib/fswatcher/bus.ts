export type FsWatcherEventType =
	| "ready"
	| "file-add"
	| "file-change"
	| "file-remove"
	| "dir-add"
	| "dir-remove"

export type FsWatcherEvent = {
	type: FsWatcherEventType
	path?: string
}

const listeners = new Set<(event: FsWatcherEvent) => void>()

export function onFsWatcherEvent(listener: (event: FsWatcherEvent) => void) {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

export function emitFsWatcherEvent(event: FsWatcherEvent) {
	for (const listener of listeners) {
		listener(event)
	}
}
