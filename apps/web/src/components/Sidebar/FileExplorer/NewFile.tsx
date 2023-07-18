import { FunctionComponent } from "preact"
import { Folder, useStore } from "../../../store"
import { nanoid } from "nanoid"
import { useState } from "preact/hooks"

interface Props {
  workspaceId: string
  parentId: string
  type: "file" | "folder"
}

const NewFile: FunctionComponent<Props> = ({ workspaceId, parentId, type }) => {
  const [name, setName] = useState("")
  const files = useStore(state => state.workspaces[workspaceId].filesRemoteHandler!)
  const setFileToAdd = useStore(state => state.setFileToAdd)

  const saveFile = () => {
    if (name) {
      const id = nanoid()

      if (type === "file") {
        files.set(id, {
          id,
          name,
          parent: parentId,
          type: "file"
        })
      } else {
        files.set(id, {
          id,
          name,
          parent: parentId,
          type: "folder",
          children: []
        })

        const parent = files.get(parentId) as Folder

        files.set(parentId, {
          ...parent,
          children: [...parent.children, id]
        } as Folder)
      }
    }
    setFileToAdd(workspaceId, null)
  }

  return (
    <input
      value={name}
      onInput={ev => setName(ev.currentTarget.value)}
      type="text"
      autoFocus
      onBlur={saveFile}
    />
  )
}

export default NewFile
