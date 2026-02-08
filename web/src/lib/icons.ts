import { generateManifest } from "material-icon-theme"

const icons: Record<string, string> = import.meta.glob(
	"../../node_modules/material-icon-theme/icons/*.svg",
	{
		eager: true,
		query: "?url",
		import: "default"
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

		if (icon === undefined) {
			if (filename.endsWith(".ts")) icon = "typescript"
			if (filename.endsWith(".js")) icon = "javascript"
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
	const suffix = type === "folder-open" ? "-open" : ""
	const key = `../../node_modules/material-icon-theme/icons/${icon}${suffix}.svg`
	const fallbackKey =
		type === "file"
			? "../../node_modules/material-icon-theme/icons/file.svg"
			: "../../node_modules/material-icon-theme/icons/folder.svg"
	return icons[key] ?? icons[fallbackKey] ?? ""
}
