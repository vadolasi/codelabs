<script lang="ts">
import { catppuccinMocha } from "@catppuccin/codemirror"
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap
} from "@codemirror/autocomplete"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting
} from "@codemirror/language"
import { lintKeymap } from "@codemirror/lint"
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search"
import {
  EditorState,
  type EditorStateConfig,
  type Extension,
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
import { onDestroy, onMount } from "svelte"
import editorState, {
  engine,
} from "./editorState.svelte"
import { getLanguage } from "./language"

let view: EditorView
let editorContainer: HTMLDivElement
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
    async function setupEditor() {
      const previousTab = editorState.previousTab
      if (previousTab) {
        editorState.saveState(previousTab, view.state.toJSON())
      }

      const config: EditorStateConfig = {
        extensions: [
          keymap.of(defaultKeymap),
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          foldGutter(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          rectangularSelection(),
          crosshairCursor(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          LoroExtensions(
            editorState.loroDoc,
            {
              ephemeral: editorState.ephemeralStore,
              user: { name: editorState.username ?? "anonymous", colorClassName: "user1" }
            },
            editorState.undoManager,
            () => {
              const item = editorState.filesMap.get(editorState.currentTab!)

              const container = item.get("editableContent")
              if (container instanceof LoroText) {
                return container
              }

              const text = new LoroText()
              const data = item.get("data") as Item
              text.update(data.type === "file" ? data.content : "")
              item.setContainer("editableContent", text)
              editorState.loroDoc.commit()
              return text
            }
          ),
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
            ...completionKeymap,
            ...lintKeymap
          ]),
          editorTheme,
          catppuccinMocha,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const item = editorState.filesMap.get(editorState.currentTab!)
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

      const languageSupport = await getLanguage(editorState.currentTab!)

      if (languageSupport) {
        ;(config.extensions as Extension[]).push(languageSupport)
      }

      const previousState = editorState.getState(editorState.currentTab!)
      view.setState(
        previousState
          ? EditorState.fromJSON(previousState, config)
          : EditorState.create(config)
      )
    }

    setupEditor()
  }
})
</script>

<div class="w-full h-full flex flex-col">
  <div bind:this={editorContainer} class="flex-1 overflow-hidden"></div>
</div>
