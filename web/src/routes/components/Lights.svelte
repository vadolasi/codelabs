<script lang="ts">
import { cn } from "$lib/cn"

type Direction = "top" | "bottom"

export let direction: Direction = "bottom"

let className = ""

export { className as class }

$: gradientDirection = direction === "top" ? "0deg" : "180deg"
$: positionClass = direction === "top" ? "top-[-200px]" : "bottom-[-200px]"
</script>

<div class={cn('w-full h-full overflow-hidden', className)}>
  <div
    style={`background: conic-gradient(from ${gradientDirection} at 50% 50%, var(--blue-500) 0deg, var(--cyan-400) 180deg, var(--yellow-400) 1turn); filter: blur(75px); opacity: 20%;`}
    class={`w-full h-full relative ${positionClass}`}
  ></div>
</div>
