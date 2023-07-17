import { useState, useRef, useEffect } from "preact/hooks"
import { EditorView, basicSetup } from "codemirror"
import { cobalt } from "thememirror"

export default function useCodeMirror(extensions: any[]) {
  const ref = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<EditorView>()

  useEffect(() => {
    const view = new EditorView({
      extensions: [
        basicSetup,
        cobalt,
        ...extensions,
      ],
      parent: ref.current!
    })

    setView(view)

    return () => {
      view.destroy()
      setView(undefined)
    }
  }, [])

  return { ref, view }
}
