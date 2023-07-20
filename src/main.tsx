import { render } from "preact"
import App from "./app.tsx"
import "./index.css"
import "@unocss/reset/tailwind.css"
import "uno.css"
import "virtual:unocss-devtools"
import "use-context-menu/styles.css"

render(<App />, document.getElementById("app")!)
