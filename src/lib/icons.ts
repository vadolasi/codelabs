import { generateManifest } from "material-icon-theme"

const icons: Record<string, { default: string }> = import.meta.glob(
	"../../node_modules/material-icon-theme/icons/*.svg",
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

export default function getIcon(
	filename: string,
	type: "file" | "folder-open" | "folder-closed"
) {
	let icon: string | undefined

	if (type === "file") {
		icon = manifest.fileNames?.[filename]

		if (icon === undefined) {
			for (const ext of getExtensions(filename)) {
				icon = manifest.fileExtensions?.[ext]
				if (icon) break
			}
		}

		return icons[
			`../../node_modules/material-icon-theme/icons/${icon ?? "file"}.svg`
		].default
	}

	icon = manifest.folderNames?.[filename] ?? "folder"

	return icons[
		`../../node_modules/material-icon-theme/icons/${icon}${type === "folder-open" ? "-open" : ""}.svg`
	].default
}
