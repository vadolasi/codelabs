<script lang="ts">
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
import { EditorState, type EditorStateConfig } from "@codemirror/state"
import {
	EditorView,
	crosshairCursor,
	drawSelection,
	dropCursor,
	highlightActiveLine,
	highlightActiveLineGutter,
	highlightSpecialChars,
	keymap,
	lineNumbers,
	rectangularSelection
} from "@codemirror/view"
import { onMount } from "svelte"
import editorState, { webcontainer } from "./editorState.svelte"

let view: EditorView
const editorTheme = EditorView.theme({
  "&": {
    width: "100%",
    height: "100%",
    flex: 1
  }
})

onMount(() => {
	view = new EditorView({ parent: editorContainer })
})

let editorContainer: HTMLDivElement

$effect(() => {
	if (editorState.currentTab) {
		async function setupEditor() {
			const previousTab = editorState.getPreviousTab()
			if (previousTab) {
				editorState.saveState(previousTab, view.state.toJSON())
			}
      const config: EditorStateConfig = {
        doc: await webcontainer.current.fs.readFile(
          editorState.currentTab!,
          "utf-8"
        ),
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
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
            ...completionKeymap,
            ...lintKeymap
          ]),
          EditorView.updateListener.of(async (update) => {
            if (update.docChanged) {
              webcontainer.current.fs.writeFile(
                editorState.currentTab!,
                update.state.doc.toString()
              )
            }
          }),
          editorTheme
        ]
      }
      const previousState = editorState.getState(editorState.currentTab!)
			view.setState(
        previousState ?
          EditorState.fromJSON(previousState, config)
          : EditorState.create(config)
			)
		}

		setupEditor()
	}
})
</script>

<div class="flex flex-col w-full h-full">
  {#if editorState.tabs.length > 0}
    <div class="flex w-full h-12">
      {#each editorState.tabs as tab (tab.getItemData().path)}
        <button type="button" class="p-3 hover:bg-gray-200" onclick={() => editorState.setCurrentTab(tab)}>
          <span>{tab.getItemName()}</span>
        </button>
      {/each}
    </div>
  {/if}
  <div bind:this={editorContainer} class="w-full h-[calc(100%-3rem)]" class:hidden={editorState.currentTab === null}></div>
  {#if editorState.currentTab === null}
    <div class="w-full h-full flex items-center justify-center">
      <span>No file selected</span>
    </div>
  {/if}
</div>
