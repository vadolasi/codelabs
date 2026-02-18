<script lang="ts">
  import { onMount } from "svelte"
  import { engine } from "./editorState.svelte"

  let outputElement: HTMLDivElement
  let inputElement: HTMLInputElement
  let content = $state("")

  onMount(() => {
    if (engine.current?.spawnTerminal) {
      engine.current.spawnTerminal({ cols: 80, rows: 24 }).then((process) => {
        const reader = process.output.getReader()
        const writer = process.input.getWriter()

        const read = async () => {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            
            const chunk = String(value)
            
            // Suporte para limpeza de tela (ANSI clear) - verificamos qualquer parte do chunk
            if (chunk.includes("\u001b[2J")) {
              content = ""
              // Se o chunk contiver mais texto após o código de limpeza, processamos o resto
              const cleanChunk = chunk.replace("\u001b[2J", "")
              if (!cleanChunk) continue
              content += cleanChunk
            } else {
              content += chunk
            }
            
            if (inputElement) inputElement.focus()

            setTimeout(() => {
              if (outputElement) outputElement.scrollTop = outputElement.scrollHeight
            }, 0)
          }
        }
        read()

        inputElement.onkeydown = (e) => {
          if (e.key === "Enter") {
            const val = inputElement.value
            writer.write(val)
            inputElement.value = ""
          }
        }
      })
    }
  })
</script>

<div class="flex flex-col h-full bg-base-300 font-mono text-sm overflow-hidden">
  <div 
    bind:this={outputElement}
    class="flex-1 overflow-auto p-2 whitespace-pre-wrap break-all"
  >
    {content}
  </div>
  <div class="flex items-center gap-2 p-2 bg-base-200 border-t border-base-100">
    <span class="text-success font-bold">❯</span>
    <input 
      bind:this={inputElement}
      type="text" 
      class="flex-1 bg-transparent border-none outline-none ring-0 text-base-content" 
      placeholder="Digite e pressione Enter..."
    />
  </div>
</div>
