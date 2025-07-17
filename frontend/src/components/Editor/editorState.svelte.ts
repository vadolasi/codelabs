import type { ItemInstance } from "@headless-tree/core"
import type { WebContainer } from "@webcontainer/api"
import {
	EphemeralStore,
	LoroDoc,
	type LoroList,
	type LoroMap,
	UndoManager
} from "loro-crdt"
import { SvelteMap } from "svelte/reactivity"

export const loroDoc = new LoroDoc()
export const filesMap = loroDoc.getMap("files") as LoroMap<
	Record<string, LoroMap<Record<string, Item | LoroList>>>
>
export const ephemeralStore = new EphemeralStore()
export const undoManager = new UndoManager(loroDoc, {})

class EditorState {
	public currentTab: string | null = $state(null)
	public tabs: ItemInstance<Item>[] = $state([])
	private states: Map<string, object> = new Map()
	private tabHistory: string[] = []
	private prewviewers: SvelteMap<number, string> = new SvelteMap()

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
}

const editorState = new EditorState()
export const webcontainer: { current: WebContainer } = {} as {
	current: WebContainer
}

export default editorState
