import { LanguageDescription } from "@codemirror/language"

export const supportedLanguages = [
	LanguageDescription.of({
		name: "TS",
		extensions: ["ts"],
		async load() {
			return import("@codemirror/lang-javascript").then((module) =>
				module.javascript({ typescript: true })
			)
		}
	}),
	LanguageDescription.of({
		name: "JS",
		extensions: ["js", "mjs", "cjs"],
		async load() {
			return import("@codemirror/lang-javascript").then((module) =>
				module.javascript()
			)
		}
	}),
	LanguageDescription.of({
		name: "TSX",
		extensions: ["tsx"],
		async load() {
			return import("@codemirror/lang-javascript").then((module) =>
				module.javascript({ jsx: true, typescript: true })
			)
		}
	}),
	LanguageDescription.of({
		name: "JSX",
		extensions: ["jsx"],
		async load() {
			return import("@codemirror/lang-javascript").then((module) =>
				module.javascript({ jsx: true })
			)
		}
	}),
	LanguageDescription.of({
		name: "HTML",
		extensions: ["html"],
		async load() {
			return import("@codemirror/lang-html").then((module) => module.html())
		}
	}),
	LanguageDescription.of({
		name: "CSS",
		extensions: ["css"],
		async load() {
			return import("@codemirror/lang-css").then((module) => module.css())
		}
	}),
	LanguageDescription.of({
		name: "SASS",
		extensions: ["sass"],
		async load() {
			return import("@codemirror/lang-sass").then((module) =>
				module.sass({ indented: true })
			)
		}
	}),
	LanguageDescription.of({
		name: "SCSS",
		extensions: ["scss"],
		async load() {
			return import("@codemirror/lang-sass").then((module) =>
				module.sass({ indented: false })
			)
		}
	}),
	LanguageDescription.of({
		name: "JSON",
		extensions: ["json"],
		async load() {
			return import("@codemirror/lang-json").then((module) => module.json())
		}
	}),
	LanguageDescription.of({
		name: "Markdown",
		extensions: ["md"],
		async load() {
			return import("@codemirror/lang-markdown").then((module) =>
				module.markdown()
			)
		}
	}),
	LanguageDescription.of({
		name: "Wasm",
		extensions: ["wat"],
		async load() {
			return import("@codemirror/lang-wast").then((module) => module.wast())
		}
	}),
	LanguageDescription.of({
		name: "Python",
		extensions: ["py"],
		async load() {
			return import("@codemirror/lang-python").then((module) => module.python())
		}
	}),
	LanguageDescription.of({
		name: "C++",
		extensions: ["cpp"],
		async load() {
			return import("@codemirror/lang-cpp").then((module) => module.cpp())
		}
	}),
	LanguageDescription.of({
		name: "Yaml",
		extensions: ["yaml", "yml"],
		async load() {
			return import("@codemirror/lang-yaml").then((module) => module.yaml())
		}
	}),
	LanguageDescription.of({
		name: "XML / SVG",
		extensions: ["xml", "svg"],
		async load() {
			return import("@codemirror/lang-xml").then((module) => module.xml())
		}
	}),
	LanguageDescription.of({
		name: "Vue",
		extensions: ["vue"],
		async load() {
			return import("@codemirror/lang-vue").then((module) => module.vue())
		}
	}),
	LanguageDescription.of({
		name: "Jinja",
		extensions: ["jinja", "jinja2", "j2"],
		async load() {
			return import("@codemirror/lang-jinja").then((module) => module.jinja())
		}
	}),
	LanguageDescription.of({
		name: "Svelte",
		extensions: ["svelte"],
		async load() {
			return import("@replit/codemirror-lang-svelte").then((module) =>
				module.svelte()
			)
		}
	})
]

export async function getLanguage(fileName: string) {
	const languageDescription = LanguageDescription.matchFilename(
		supportedLanguages,
		fileName
	)

	if (languageDescription) {
		return await languageDescription.load()
	}

	return undefined
}
