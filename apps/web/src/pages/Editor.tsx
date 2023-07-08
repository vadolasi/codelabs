import CodeMirror from "@uiw/react-codemirror"
import * as Y from "yjs"
// @ts-ignore
import { yCollab } from "y-codemirror.next"
import { HocuspocusProvider } from "@hocuspocus/provider"

export const userColors = [
  { color: "#30bced", light: "#30bced33" },
  { color: "#6eeb83", light: "#6eeb8333" },
  { color: "#ffbc42", light: "#ffbc4233" },
  { color: "#ecd444", light: "#ecd44433" },
  { color: "#ee6352", light: "#ee635233" },
  { color: "#9ac2c9", light: "#9ac2c933" },
  { color: "#8acb88", light: "#8acb8833" },
  { color: "#1be7ff", light: "#1be7ff33" }
]

export default function Editor() {
  const provider = new HocuspocusProvider({
    url: "ws://127.0.0.1:8001",
    name: "example-document"
  })

  const ytext = provider.document.getText("codemirror")

  const undoManager = new Y.UndoManager(ytext)

  const userColor = userColors[Math.floor(Math.random() * userColors.length)]

  provider.awareness.setLocalStateField("user", {
    name: "Anonymous " + Math.floor(Math.random() * 100),
    color: userColor.color,
    colorLight: userColor.light
  })

  return (
    <div _w="screen" _h="screen" _flex="~">
      <div _w="1/2" _h="full" _flex="~">
        <CodeMirror
          value={ytext.toString()}
          height="100%"
          width="100%"
          extensions={[yCollab(ytext, provider.awareness, { undoManager })]}
          theme="dark"
          _grow="~"
        />
      </div>
      <div _w="1/2" _h="full" _flex="~">
        <CodeMirror
          value="Olá mundo!"
          height="100%"
          width="100%"
          extensions={[]}
          theme="dark"
          _grow="~"
          editable={false}
          readonly={true}
        />
      </div>
    </div>
  )
}
