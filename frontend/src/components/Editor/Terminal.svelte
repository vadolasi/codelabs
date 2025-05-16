<script lang="ts">
import type { WebContainer, WebContainerProcess } from "@webcontainer/api"
import { ClipboardAddon } from "@xterm/addon-clipboard"
import { FitAddon } from "@xterm/addon-fit"
import { ImageAddon } from "@xterm/addon-image"
import { SearchAddon } from "@xterm/addon-search"
import { Unicode11Addon } from "@xterm/addon-unicode11"
import { WebLinksAddon } from "@xterm/addon-web-links"
import { WebglAddon } from "@xterm/addon-webgl"
import { Terminal } from "@xterm/xterm"
import { onMount } from "svelte"
import { webcontainer } from "./editorState.svelte"

import "@xterm/xterm/css/xterm.css"

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

let shellProcess: WebContainerProcess

function resize() {
	fitAddon.fit()
	shellProcess?.resize({
		cols: terminal.cols,
		rows: terminal.rows
	})
}

onMount(async () => {
	terminal.open(terminalContainer)
	fitAddon.fit()
	shellProcess = await webcontainer.current.spawn("jsh", {
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
	const input = shellProcess.input.getWriter()
	terminal.onData((data) => {
		input.write(data)
	})
})
</script>

<div bind:this={terminalContainer} bind:borderBoxSize={null, resize} class="w-full h-full"></div>
