import path from "node:path"
import { fileURLToPath } from "node:url"
import { build } from "esbuild"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

await build({
	entryPoints: [path.join(rootDir, "src/lib/fswatcher/fswatcher.ts")],
	outfile: path.join(rootDir, "src/lib/fswatcher/fswatcher.bundle.cjs"),
	bundle: true,
	platform: "node",
	format: "cjs",
	target: ["node18"],
	minify: true,
	legalComments: "none"
})
