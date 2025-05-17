<script lang="ts">
import getIcon from "$lib/icons"
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
import { onMount, tick } from "svelte"
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
					editorTheme,
					catppuccinMocha
				]
			}
			const previousState = editorState.getState(editorState.currentTab!)
			view.setState(
				previousState
					? EditorState.fromJSON(previousState, config)
					: EditorState.create(config)
			)
		}

		setupEditor()

		const watcher = webcontainer.current.fs.watch(
			editorState.currentTab!,
			async (event) => {
				if (event === "change") {
					const content = await webcontainer.current.fs.readFile(
						editorState.currentTab!,
						"utf-8"
					)
					tick().then(() => {
						if (content !== view.state.doc.toString()) {
							view.dispatch({
								changes: {
									from: 0,
									to: view.state.doc.length,
									insert: content
								}
							})
						}
					})
				} else {
					if (editorState.currentTab) {
						editorState.closeTab(editorState.currentTab)
					}
				}
			}
		)

		return () => watcher.close()
	}
})

const tabNames = $derived(editorState.tabs.map((tab) => tab.getItemName()))
const duplicateFileNames = $derived(
	tabNames.filter((item, index) => tabNames.indexOf(item) !== index)
)
</script>

<div class="w-full h-full">
  {#if editorState.tabs.length > 0}
    <div class="flex w-full bg-base-100">
      {#each editorState.tabs as tab (tab.getItemData().path)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div role="button" tabindex="0" class="py-1 px-3 flex gap-1 items-center justify-center hover:bg-base-200 text-sm group border-primery select-none" class:bg-base-200={editorState.currentTab === tab.getItemData().path} onclick={() => editorState.setCurrentTab(tab)}>
          <img src={getIcon(tab.getItemName(), "file")} alt="file icon" class="w-4 h-4" />
          <span>{tab.getItemName()}</span>
          {#if duplicateFileNames.includes(tab.getItemName())}
            <span class="text-xs text-base-content/50 group-hover:text-base-content/70">/{tab.getItemData().path.split("/").splice(-2, 1)}</span>
          {/if}
          <button
            type="button"
            aria-label="Close tab"
            class="invisible group-hover:visible p-1 rounded-sm hover:bg-base-200 group-hover:hover:bg-base-300"
            class:visible={editorState.currentTab === tab.getItemData().path}
            onclick={(event) => {
              event.stopPropagation()
              editorState.closeTab(tab.getItemData().path)
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/each}
    </div>
  {/if}
  <div bind:this={editorContainer} class="w-full h-full" class:hidden={editorState.currentTab === null}></div>
  {#if editorState.currentTab === null}
    <div class="w-full h-full flex items-center justify-center bg-base-100 select-none">
      <span>No file selected</span>
    </div>
  {/if}
</div>
