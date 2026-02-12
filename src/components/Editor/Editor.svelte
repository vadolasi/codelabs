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
import { onMount } from "svelte"
import getIcon from "$lib/icons"
import editorState, {
  ephemeralStore,
  filesMap,
  loroDoc,
  undoManager
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
})

function getRandomDarkColor() {
  function toHex(c: number) {
    return c.toString(16).padStart(2, "0")
  }

  const r = Math.floor(Math.random() * 128)
  const g = Math.floor(Math.random() * 128)
  const b = Math.floor(Math.random() * 128)

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

$effect(() => {
  if (editorState.currentTab) {
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
            loroDoc,
            {
              ephemeral: ephemeralStore,
              user: { name: "a", colorClassName: getRandomDarkColor() }
            },
            undoManager,
            () => {
              const item = filesMap.get(editorState.currentTab!)

              const container = item.get("editableContent")
              if (container instanceof LoroText) {
                return container
              }

              const text = new LoroText()
              const data = item.get("data") as Item
              text.update(data.type === "file" ? data.content : "")
              item.setContainer("editableContent", text)
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
          Prec.highest(
            keymap.of([
              {
                key: "Mod-s",
                run(view) {
                  filesMap.get(editorState.currentTab!).set("data", {
                    type: "file",
                    path: editorState.currentTab!,
                    content: view.state.doc.toString()
                  })
                  loroDoc.commit()
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

const tabNames = $derived(editorState.tabs.map((tab) => tab.getItemName()))
const duplicateFileNames = $derived(
  tabNames.filter((item, index) => tabNames.indexOf(item) !== index)
)
</script>

<div class="w-full h-full flex flex-col">
  {#if editorState.tabs.length > 0}
		<div class="flex w-full bg-base-300 shrink-0 overflow-x-auto">
			{#each editorState.tabs as tab (tab.getItemData().path)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
		<div role="button" tabindex="0" class="py-1 px-3 flex gap-1 items-center justify-center hover:bg-base-200 text-sm group border-primery select-none" class:bg-base-200={editorState.currentTab === tab.getItemData().path} onclick={() => editorState.setCurrentTab(tab)}>
          <img src={getIcon(tab.getItemName(), "file")} alt="file icon" class="w-4 h-4" />
          <span class="text-nowrap">{tab.getItemName()}</span>
          {#if duplicateFileNames.includes(tab.getItemName())}
            <span class="text-xs text-base-content group-hover:text-base-content/70">/{tab.getItemData().path.split("/").splice(-2, 1)}</span>
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
  <div bind:this={editorContainer} class="flex-1 overflow-hidden" class:hidden={editorState.currentTab === null}></div>
  {#if editorState.currentTab === null}
    <div class="w-full h-full flex items-center justify-center bg-base-300 select-none">
      <span>Nenhum arquivo selecionado</span>
    </div>
  {/if}
</div>
