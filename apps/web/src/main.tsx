import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./app"

import "./index.css"

// biome-ignore lint/style/noNonNullAssertion: <explanation>
const app = createRoot(document.getElementById("root")!)

app.render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
