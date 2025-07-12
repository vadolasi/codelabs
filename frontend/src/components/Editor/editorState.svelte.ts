import type { ItemInstance } from "@headless-tree/core"
import type { WebContainer } from "@webcontainer/api"
import { EphemeralStore, LoroDoc, UndoManager } from "loro-crdt"

export const loroDoc = new LoroDoc()
export const ephemeralStore = new EphemeralStore()
export const undoManager = new UndoManager(loroDoc, {})
export const fileTree = loroDoc.getTree("fileTree")

class EditorState {
	public currentTab: string | null = $state(null)
	public tabs: ItemInstance<Item>[] = $state([])
	private states: Map<string, object> = new Map()
	private tabHistory: string[] = []
	private upToDate = $state(true)
	private prewviewers: Map<number, string> = new Map()

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

	public get isUpToDate() {
		return this.upToDate
	}

	public set isUpToDate(value: boolean) {
		this.upToDate = value
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
