import { createRoot } from "react-dom/client";
import App from "./app";

import "./index.css";

// biome-ignore lint/style/noNonNullAssertion: <explanation>
const app = createRoot(document.getElementById("root")!);

app.render(<App />);
