<script lang="ts">
  import { onMount } from "svelte"
  import type { WebContainer, WebContainerProcess } from "@webcontainer/api"
  import { Terminal } from "@xterm/xterm"
  import { ClipboardAddon } from "@xterm/addon-clipboard"
  import { ImageAddon } from "@xterm/addon-image"
  import { WebglAddon } from "@xterm/addon-webgl"
  import { Unicode11Addon } from "@xterm/addon-unicode11"
  import { WebLinksAddon } from "@xterm/addon-web-links"
  import { SearchAddon } from "@xterm/addon-search"
  import { FitAddon } from "@xterm/addon-fit"
  import { generateManifest } from "material-icon-theme"
  import { asyncDataLoaderFeature, createTree, selectionFeature, type ItemInstance } from "@headless-tree/core"
  import { Pane, Splitpanes } from "svelte-splitpanes"

  import "@xterm/xterm/css/xterm.css"

  const icons: Record<string, { default: string }> = import.meta.glob(
		"../../../node_modules/material-icon-theme/icons/*.svg",
		{
			eager: true,
			query: {
				enhanced: true
			}
		}
	)

  const manifest = generateManifest()

  function getExtensions(filename: string): string[] {
    const parts = filename.split(".")
    if (parts.length < 2) return []

    const exts: string[] = []
    for (let i = 1; i < parts.length; i++) {
      exts.push(parts.slice(i).join("."))
    }

    return exts
  }

  function getIcon(filename: string, type: "file" | "folder-open" | "folder-closed") {
    let icon: string | undefined

    if (type === "file") {
      icon = manifest.fileNames?.[filename]

      if (icon === undefined) {
        for (const ext of getExtensions(filename)) {
          icon = manifest.fileExtensions?.[ext]
          if (icon) break
        }
      }

      return icons[`../../../node_modules/material-icon-theme/icons/${icon ?? "file"}.svg`].default
    }

    icon = manifest.folderNames?.[filename] ?? "folder"

    return icons[`../../../node_modules/material-icon-theme/icons/${icon}${type === "folder-open" ? "-open" : ""}.svg`].default
  }

  type Item = {
    isFolder: boolean
    path: string
  }

  let render = $state(0)

  const tree = createTree<Item>({
    rootItemId: "/",
    getItemName: (item) => item.getItemData().path?.split("/")?.pop() || "",
    isItemFolder: (item) => item.getItemData().isFolder,
    createLoadingItemData: () => ({
      path: "Loading...",
      isFolder: false
    }),
    dataLoader: {
      getItem: async (itemId) => {
        try {
          await webcontainer.fs.readdir(itemId)

          return {
            path: itemId,
            isFolder: true
          }
        } catch (e) {
          return {
            path: itemId,
            isFolder: false
          }
        }
      },
      getChildren: async (itemId) => {
        const children = await webcontainer.fs.readdir(itemId)
        return children.map((child) => `${itemId}/${child}`.replace("//", "/"))
      }
    },
    features: [asyncDataLoaderFeature, selectionFeature],
    setState: () => render++
  })

  let loaded = $state(false)
  const { webcontainer }: { webcontainer: WebContainer } = $props()

  let shellProcess: WebContainerProcess

  onMount(async () => {
    terminal.open(terminalContainer)
    fitAddon.fit()
    webcontainer.fs.watch("/", { recursive: true }, (_, filename) => {
      tree.getItemInstance(`/${`/${(filename as string)}`.split("/").slice(1, -1).join("/")}`).invalidateChildrenIds()
    })
    shellProcess = await webcontainer.spawn("jsh", {
      terminal: {
        cols: terminal.cols,
        rows: terminal.rows
      }
    })
    shellProcess.output.pipeTo(
      new WritableStream({
        write: (data) => terminal.write(data)
      })
    )
    const input = shellProcess.input.getWriter();
    terminal.onData((data) => {
      input.write(data)
    })
    loaded = true
  })

  const terminal = new Terminal({
    convertEol: true,
    allowProposedApi: true
  })
  terminal.loadAddon(new ClipboardAddon())
  terminal.loadAddon(new ImageAddon())
  terminal.loadAddon(new WebglAddon())
  terminal.loadAddon(new Unicode11Addon())
  terminal.loadAddon(new WebLinksAddon())
  const searchAddon = new SearchAddon()
  terminal.loadAddon(searchAddon)
  const fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)

  terminal.unicode.activeVersion = "11"

  let terminalContainer: HTMLDivElement

  function resize() {
    fitAddon.fit()
    shellProcess?.resize({
      cols: terminal.cols,
      rows: terminal.rows
    })
  }

  function sortByFolderThenName(a: ItemInstance<Item>, b: ItemInstance<Item>): number {
    const aData = a.getItemData()
    const bData = b.getItemData()

     if (a.getParent()!.getItemData().path === b.getParent()!.getItemData().path) {
      if (aData.isFolder && !bData.isFolder) return -1
      if (!aData.isFolder && bData.isFolder) return 1
    }

    return aData.path.localeCompare(bData.path, undefined, { sensitivity: "base" })
  }
</script>

<div class="h-screen w-screen">
  <Splitpanes class="w-full h-full">
    <Pane>
      <div class="h-full bg-slate-900" {...tree.getContainerProps()}>
        {#key render}
          {#each tree.getItems().sort(sortByFolderThenName) as item (item.getId())}
            <div {...item.getProps()} style:padding-left={`${item.getItemMeta().level * 10}px`} class="w-full cursor-pointer text-gray-400 hover:text-white" onclick={() => item.isExpanded() ? item.collapse() : item.expand()}>
              <div class="flex items-center gap-1">
                <img src={getIcon(item.getItemName(), item.getItemData().isFolder ? item.isExpanded() ? "folder-open" : "folder-closed" : "file")} alt="folder icon" class="w-4 h-4" />
                {item.getItemName()}
                {#if item.isLoading()}
                  <span>Loading...</span>
                {/if}
              </div>
            </div>
          {/each}
        {/key}
      </div>
    </Pane>
    <Pane>
      <div bind:this={terminalContainer} bind:borderBoxSize={null, resize} class="w-full h-full"></div>
    </Pane>
  </Splitpanes>
</div>
