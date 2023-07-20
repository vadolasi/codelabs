import type { FunctionComponent } from "preact"
import { FileSystemItem, Folder, useStore } from "../store"
// @ts-ignore
import { yCollab } from "y-codemirror.next"
import Editor from "./Editor"
import classnames from "classnames"
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd"

interface Props {
  id: string
}

const Workspace: FunctionComponent<Props> = ({ id }) => {
  const { workspaces, addFile, updateFile, swapOpenedFiles } = useStore()
  const workspace = workspaces[id]
  const files = workspace.filesRemoteHandler!

  files.on("change", (changes: Map<string, { action: "add" | "delete" | "update", newValue?: FileSystemItem, oldValue?: FileSystemItem }>) => {
     changes.forEach(({ action, newValue }) => {
      switch (action) {
        case "add":
          addFile(
            newValue?.id!,
            id,
            newValue?.parent!,
            newValue?.name!,
            newValue?.type!,
            (newValue as Folder)?.children
          )
          break
        case "update":
          updateFile(
            id,
            newValue?.id!,
            newValue!
          )
          break
        default:
          console.log(action, newValue)
          break
      }
    })
  })

  const onDragEnd = (result: DropResult) => {
    swapOpenedFiles(id, result.source.index, result.destination!.index)
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div key={id} _flex="~ col" _w="full" _h="full" _grow="~" _items="center" _justify="center">
        <Droppable droppableId={id} direction="horizontal">
          {provided => (
            <div
              _flex="~"
              ref={provided.innerRef}
              {...provided.droppableProps}
              _gap="1"
            >
              {provided.placeholder}
              {workspace.openedFiles.map(file => workspace.files[file]).map((file, index) => (
                <Draggable key={file.id} draggableId={file.id} index={index}>
                  {provided => (
                    <div
                      key={file.id}
                      _text={classnames("sm gray-300", { "white": file.id === workspace.currentFile })}
                      _p="1"
                      ref={provided.innerRef}
                      {...provided.draggableProps as any}
                      {...provided.dragHandleProps as any}
                      _cursor="pointer"
                    >
                      {file.name}
                    </div>
                  )}
                </Draggable>
              ))}
            </div>
          )}
        </Droppable>
        {workspace.currentFile ? (
          <Editor workspaceId={workspace.id} fileId={workspace.currentFile} />
        ) : (
          <h1 _text="lg" _select="none">Nenhum arquivo selecionado</h1>
        )}
      </div>
    </DragDropContext>
  )
}

export default Workspace
