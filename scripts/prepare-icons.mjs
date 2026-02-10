import { cp, mkdir, stat } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const sourceDir = path.resolve(
  __dirname,
  "../node_modules/material-icon-theme/icons"
)
const targetDir = path.resolve(__dirname, "../static/material-icons")

await mkdir(targetDir, { recursive: true })

try {
  const sourceStats = await stat(sourceDir)
  if (!sourceStats.isDirectory()) {
    throw new Error("material-icon-theme icons directory not found")
  }
} catch (error) {
  throw new Error(
    `Failed to locate material-icon-theme icons at ${sourceDir}: ${error}`
  )
}

await cp(sourceDir, targetDir, { recursive: true })

console.log(`Copied material-icon-theme icons to ${targetDir}`)
