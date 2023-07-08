import { Route } from "wouter-preact"
import Editor from "./pages/Editor"

export default function App() {
  return (
    <>
      <Route path="/editor" component={Editor} />
    </>
  )
}
