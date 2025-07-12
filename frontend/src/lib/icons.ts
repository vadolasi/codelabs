import { generateManifest } from "material-icon-theme"

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

export function getIconName(
	filename: string,
	type: "file" | "folder-open" | "folder-closed"
) {
	const formmatedFilename = filename.toLocaleLowerCase()
	let icon: string | undefined

	if (type === "file") {
		icon = manifest.fileNames?.[formmatedFilename]

		if (icon === undefined) {
			for (const ext of getExtensions(formmatedFilename)) {
				icon = manifest.fileExtensions?.[ext]
				if (icon === undefined) {
					icon = manifest.languageIds?.[ext]
				}
				if (icon) break
			}
		}

		return icon ?? "file"
	}

	icon = manifest.folderNames?.[formmatedFilename] ?? "folder"

	return icon
}

export default function getIcon(
	filename: string,
	type: "file" | "folder-open" | "folder-closed"
) {
	const icon = getIconName(filename, type)

	return icons[
		`../../../node_modules/material-icon-theme/icons/${icon}${type === "folder-open" ? "-open" : ""}.svg`
	].default
}
