import { render } from "preact"
import App from "./app.tsx"
import "./index.css"
import "uno.css"
import "virtual:unocss-devtools"

render(<App />, document.getElementById("app")!)
