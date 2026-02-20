import { indentUnit } from "@codemirror/language"
import { EditorState, type Extension } from "@codemirror/state"

export interface EditorSettings {
  indentSize: number
  tabSize: number
}

const defaultSettings: EditorSettings = {
  indentSize: 2,
  tabSize: 2
}

const languageSettings: Record<string, Partial<EditorSettings>> = {
  py: {
    indentSize: 4,
    tabSize: 4
  },
  html: {
    indentSize: 2,
    tabSize: 2
  }
}

export function getEditorSettings(path: string): EditorSettings {
  const ext = path.split(".").pop() || ""
  const settings = { ...defaultSettings, ...(languageSettings[ext] || {}) }
  return settings
}

export function getSettingsExtensions(settings: EditorSettings): Extension[] {
  return [
    EditorState.tabSize.of(settings.tabSize),
    indentUnit.of(" ".repeat(settings.indentSize))
  ]
}
