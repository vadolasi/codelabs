import type { ItemInstance } from "@headless-tree/core"
import {
  EphemeralStore,
  LoroDoc,
  type LoroList,
  type LoroMap,
  UndoManager
} from "loro-crdt"
import { SvelteMap } from "svelte/reactivity"
import type BaseEngine from "$lib/engine/base.svelte"

class EditorState {
  public currentTab: string | null = $state(null)
  public tabs: ItemInstance<Item>[] = $state([])
  private states: Map<string, object> = new Map()
  private tabHistory: string[] = []
  private prewviewers: SvelteMap<number, string> = new SvelteMap()
  username: string | null = $state(null)

  // Instâncias dinâmicas do Loro
  public loroDoc = $state(this.createDoc())
  public filesMap = $derived(
    this.loroDoc.getMap("files") as LoroMap<
      Record<string, LoroMap<Record<string, Item | LoroList>>>
    >
  )
  public ephemeralStore = $state(new EphemeralStore())
  public undoManager = $state(new UndoManager(this.loroDoc, {}))

  private createDoc() {
    const doc = new LoroDoc()
    // PeerID único é essencial para sincronização
    doc.setPeerId(BigInt(Math.floor(Math.random() * 1000000000)))
    return doc
  }

  public reset() {
    this.currentTab = null
    this.tabs = []
    this.states.clear()
    this.tabHistory = []
    this.prewviewers.clear()

    // Recriamos as instâncias do Loro com novas identidades
    this.loroDoc = this.createDoc()
    this.ephemeralStore = new EphemeralStore()
    this.undoManager = new UndoManager(this.loroDoc, {})
  }

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
export const engine: { current: BaseEngine | null } = $state({ current: null })

export default editorState
