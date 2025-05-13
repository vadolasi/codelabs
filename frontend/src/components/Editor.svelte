<script lang="ts">
  import { onMount } from "svelte"
  import { WebContainer, type WebContainerProcess } from "@webcontainer/api"
  import { Terminal } from "@xterm/xterm"
  import { ClipboardAddon } from "@xterm/addon-clipboard"
  import { ImageAddon } from "@xterm/addon-image"
  import { WebglAddon } from "@xterm/addon-webgl"
  import { Unicode11Addon } from "@xterm/addon-unicode11"
  import { WebLinksAddon } from "@xterm/addon-web-links"
  import { SearchAddon } from "@xterm/addon-search"
  import { FitAddon } from "@xterm/addon-fit"

  import "@xterm/xterm/css/xterm.css"

  let loaded = $state(false)
  let webcontainer: WebContainer
  let shellProcess: WebContainerProcess

  onMount(async () => {
    terminal.open(terminalContainer)
    fitAddon.fit()
    webcontainer = await WebContainer.boot({ workdirName: "codelabs" })
    webcontainer.fs.watch("/", { recursive: true }, (event, filename) => {
      console.log("File system event:", event, filename)
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
</script>

<div>
  <div bind:this={terminalContainer} bind:borderBoxSize={null, resize}></div>
</div>
