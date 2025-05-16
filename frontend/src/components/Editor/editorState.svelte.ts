import type { ItemInstance } from "@headless-tree/core"
import type { WebContainer } from "@webcontainer/api"

class EditorState {
	public currentTab: string | null = $state(null)
	public tabs: ItemInstance<{ path: string; isFolder: boolean }>[] = $state([])
	private states: Map<string, object> = new Map()
	private tabHistory: string[] = []

	public setCurrentTab(
		item: ItemInstance<{ path: string; isFolder: boolean }>
	) {
		const path = item.getItemData().path
		if (!this.tabs.find((tab) => tab.getItemData().path === path)) {
			this.tabs.push(item)
		}
		this.currentTab = path
		this.tabHistory.push(path)
	}

	public removeTab(path: string) {
		this.tabs = this.tabs.filter((t) => t.getItemData().path !== path)
		this.tabHistory = this.tabHistory.filter((t) => t !== path)
		if (this.currentTab === path) {
			this.currentTab = this.tabHistory[this.tabHistory.length - 1] || null
		}
	}

	public getPreviousTab() {
		return this.tabHistory[this.tabHistory.length - 2] || null
	}

	public saveState(path: string, state: object) {
		this.states.set(path, state)
	}

	public getState(path: string) {
		return this.states.get(path)
	}
}

const editorState = new EditorState()
export const webcontainer: { current: WebContainer } = {} as {
	current: WebContainer
}

export default editorState
