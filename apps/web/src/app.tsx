import { Route } from "wouter-preact"
import Editor from "./pages/Editor"
import { Provider } from "urql"
import { client } from "./client"
import { DragDropContext } from "react-beautiful-dnd"
import { Toaster } from "react-hot-toast"
import Home from "./pages/Home"

export default function App() {
  return (
    <DragDropContext onDragEnd={() => {}}>
      <Provider value={client}>
        <Route path="/" component={Home} />
        <Route path="/room/:id">
          {({ id }) => <Editor id={id} />}
        </Route>
      </Provider>
      <Toaster/>
    </DragDropContext>
  )
}
