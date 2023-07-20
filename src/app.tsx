import { Route, Switch } from "wouter-preact"
import Editor from "./pages/Editor"
import { Provider } from "urql"
import { client } from "./client"
import { Toaster } from "react-hot-toast"
import Home from "./pages/Home"
import Error404 from "./pages/404"

export default function App() {
  return (
    <Provider value={client}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/room/:id">
          {({ id }) => <Editor id={id} />}
        </Route>
        <Route component={Error404} />
      </Switch>
      <Toaster/>
    </Provider>
  )
}
