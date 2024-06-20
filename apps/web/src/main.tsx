import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import App from "./app";

// biome-ignore lint/style/noNonNullAssertion: No need to check for null here
const app = createRoot(document.getElementById("root")!);

app.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
