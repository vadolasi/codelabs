<script lang="ts">
import { catppuccinMocha } from "@catppuccin/codemirror"
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap
} from "@codemirror/autocomplete"
import { defaultKeymap, historyKeymap, indentWithTab } from "@codemirror/commands"
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput
} from "@codemirror/language"
import { lintKeymap } from "@codemirror/lint"
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search"
import {
  Compartment,
  EditorState,
  type EditorStateConfig,
  Prec
} from "@codemirror/state"
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection
} from "@codemirror/view"
import { LoroExtensions } from "loro-codemirror"
import { LoroMap, LoroText } from "loro-crdt"
import { onMount } from "svelte"
import editorState, { type WorkspaceItemData } from "./editorState.svelte"
import { getLanguage } from "./language"
import { getEditorSettings, getSettingsExtensions } from "./settings"

let view: EditorView
let editorContainer: HTMLDivElement
const languageCompartment = new Compartment()

const editorTheme = EditorView.theme({
  "&": {
    width: "100%",
    height: "100%",
    flex: 1
  }
})

onMount(() => {
  view = new EditorView({ parent: editorContainer })

  const handleSave = () => {
    const currentTab = editorState.currentTab
    if (!currentTab) return

    const content = view.state.doc.toString()

    editorState.mirror.setState((s) => {
      const item = s.files[currentTab] as { data: WorkspaceItemData } | undefined
      if (item?.data.type === "file") {
        item.data.content = content
      }
    })

    editorState.unsavedPaths.delete(currentTab)
    editorState.loroDoc.commit()
  }

  window.addEventListener("editor-save", handleSave)
  return () => window.removeEventListener("editor-save", handleSave)
})

$effect(() => {
  if (editorState.currentTab && editorState.loroDoc) {
    function setupEditor() {
      const currentTab = editorState.currentTab
      if (!currentTab) return

      const previousTab = editorState.previousTab
      if (previousTab && view.state) {
        editorState.saveState(previousTab, view.state.toJSON())
      }

      const settings = getEditorSettings(currentTab)
      const settingsExtensions = getSettingsExtensions(settings)

      const extensionGroups = [
        {
          name: "base",
          extension: [
            lineNumbers(),
            highlightActiveLineGutter(),
            highlightSpecialChars(),
            foldGutter(),
            drawSelection(),
            dropCursor(),
            EditorState.allowMultipleSelections.of(true),
            indentOnInput(),
            bracketMatching(),
            closeBrackets(),
            autocompletion(),
            rectangularSelection(),
            crosshairCursor(),
            highlightActiveLine(),
            highlightSelectionMatches()
          ]
        },
        {
          name: "settings",
          extension: settingsExtensions
        },
        {
          name: "language-compartment",
          extension: languageCompartment.of([])
        },
        {
          name: "loro-collaboration",
          extension: LoroExtensions(
            editorState.loroDoc,
            {
              ephemeral: editorState.ephemeralStore,
              user: { name: editorState.username ?? "anonymous", colorClassName: "user1" }
            },
            editorState.undoManager,
            () => {
              const activeTab = editorState.currentTab
              if (!activeTab) return new LoroText()

              const filesMap = editorState.loroDoc.getMap("files") as LoroMap
              const item = filesMap.get(activeTab)
              if (!(item instanceof LoroMap)) return new LoroText()

              const container = item.get("editableContent")
              if (container instanceof LoroText) {
                return container
              }

              const text = new LoroText()
              const data = item.get("data") as WorkspaceItemData | undefined
              text.update(data?.type === "file" ? (data.content ?? "") : "")
              item.setContainer("editableContent", text)
              editorState.loroDoc.commit()
              return text
            }
          )
        },
        {
          name: "keymap",
          extension: keymap.of([
            {
              key: "Mod-z",
              run: () => {
                editorState.undoManager.undo()
                return true
              },
              preventDefault: true
            },
            {
              key: "Mod-y",
              run: () => {
                editorState.undoManager.redo()
                return true
              },
              preventDefault: true
            },
            {
              key: "Mod-Shift-z",
              run: () => {
                editorState.undoManager.redo()
                return true
              },
              preventDefault: true
            },
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
            ...completionKeymap,
            ...lintKeymap,
            indentWithTab
          ])
        },
        {
          name: "theme",
          extension: [catppuccinMocha, editorTheme]
        },
        {
          name: "update-listener",
          extension: EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const activeTab = editorState.currentTab
              if (!activeTab) return

              const item = editorState.state.files[activeTab] as
                | { data: WorkspaceItemData }
                | undefined
              if (!item || item.data.type !== "file") return

              const data = item.data
              const currentContent = update.state.doc.toString()

              if (currentContent !== (data.content ?? "")) {
                editorState.unsavedPaths.add(activeTab)
              } else {
                editorState.unsavedPaths.delete(activeTab)
              }

              editorState.loroDoc.commit()
            }
          })
        },
        {
          name: "save-shortcut",
          extension: Prec.highest(
            keymap.of([
              {
                key: "Mod-s",
                run(view) {
                  const activeTab = editorState.currentTab
                  if (!activeTab) return false

                  const content = view.state.doc.toString()

                  editorState.mirror.setState((s) => {
                    const item = s.files[activeTab] as
                      | { data: WorkspaceItemData }
                      | undefined
                    if (item?.data.type === "file") {
                      item.data.content = content
                    }
                  })

                  editorState.unsavedPaths.delete(activeTab)
                  editorState.loroDoc.commit()
                  return true
                }
              }
            ])
          )
        }
      ]

      const config: EditorStateConfig = {
        extensions: extensionGroups.map((group) => group.extension)
      }

      const previousState = editorState.getState(currentTab)
      if (previousState) {
        try {
          view.setState(EditorState.fromJSON(previousState, config))
        } catch (error) {
          console.error(
            "[CodeViewer] Failed to restore editor state from JSON. Recreating state.",
            error
          )
          editorState.clearState(currentTab)
          view.setState(EditorState.create(config))
        }
      } else {
        view.setState(EditorState.create(config))
      }

      getLanguage(currentTab).then((languageSupport) => {
        if (languageSupport && view && editorState.currentTab === currentTab) {
          try {
            view.dispatch({
              effects: languageCompartment.reconfigure(languageSupport)
            })
          } catch (error) {
            console.error("[CodeViewer] Failed to apply language support.", error)
          }
        }
      }).catch((error) => {
        console.error("[CodeViewer] Failed to load language support.", error)
      })
    }

    setupEditor()
  }
})
</script>

<div class="w-full h-full flex flex-col">
  <div bind:this={editorContainer} class="flex-1 overflow-hidden"></div>
</div>
