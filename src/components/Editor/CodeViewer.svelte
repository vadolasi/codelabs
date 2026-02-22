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
import { LoroText } from "loro-crdt"
import { onMount } from "svelte"
import editorState from "./editorState.svelte"
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
    if (!editorState.currentTab) return
    const item = editorState.filesMap.get(editorState.currentTab)
    const content = view.state.doc.toString()
    
    item.set("data", {
      type: "file",
      path: editorState.currentTab,
      content
    })
    
    editorState.unsavedPaths.delete(editorState.currentTab)
    editorState.loroDoc.commit()
  }

  window.addEventListener('editor-save', handleSave)
  return () => window.removeEventListener('editor-save', handleSave)
})

$effect(() => {
  if (editorState.currentTab && editorState.loroDoc) {
    function setupEditor() {
      const previousTab = editorState.previousTab
      if (previousTab && view.state) {
        editorState.saveState(previousTab, view.state.toJSON())
      }

      const settings = getEditorSettings(editorState.currentTab!)
      const settingsExtensions = getSettingsExtensions(settings)

      const config: EditorStateConfig = {
        extensions: [
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
          highlightSelectionMatches(),
          ...settingsExtensions,
          catppuccinMocha,
          languageCompartment.of([]),
          LoroExtensions(
            editorState.loroDoc,
            {
              ephemeral: editorState.ephemeralStore,
              user: { name: editorState.username ?? "anonymous", colorClassName: "user1" }
            },
            editorState.undoManager,
            () => {
              const item = editorState.filesMap.get(editorState.currentTab!)
              if (!item) return new LoroText()

              const container = item.get("editableContent")
              if (container instanceof LoroText) {
                return container
              }

              const text = new LoroText()
              const data = item.get("data") as any
              text.update(data.type === "file" ? data.content : "")
              item.setContainer("editableContent", text)
              editorState.loroDoc.commit()
              return text
            }
          ),
          keymap.of([
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
          ]),
          editorTheme,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const item = editorState.filesMap.get(editorState.currentTab!)
              if (!item) return

              const data = item.get("data") as any
              const currentContent = update.state.doc.toString()

              if (currentContent !== data.content) {
                editorState.unsavedPaths.add(editorState.currentTab!)
              } else {
                editorState.unsavedPaths.delete(editorState.currentTab!)
              }

              editorState.loroDoc.commit()
            }
          }),
          Prec.highest(
            keymap.of([
              {
                key: "Mod-s",
                run(view) {
                  const item = editorState.filesMap.get(editorState.currentTab!)
                  const content = view.state.doc.toString()
                  
                  item.set("data", {
                    type: "file",
                    path: editorState.currentTab!,
                    content
                  })

                  editorState.unsavedPaths.delete(editorState.currentTab!)
                  editorState.loroDoc.commit()
                  return true
                }
              }
            ])
          )
        ]
      }

      const previousState = editorState.getState(editorState.currentTab!)
      view.setState(
        previousState
          ? EditorState.fromJSON(previousState, config)
          : EditorState.create(config)
      )

      getLanguage(editorState.currentTab!).then(languageSupport => {
        if (languageSupport && view) {
          view.dispatch({
            effects: languageCompartment.reconfigure(languageSupport)
          })
        }
      })
    }

    setupEditor()
  }
})
</script>

<div class="w-full h-full flex flex-col">
  <div bind:this={editorContainer} class="flex-1 overflow-hidden"></div>
</div>
