import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./app";

// biome-ignore lint/style/noNonNullAssertion: No need to check for null here
const app = createRoot(document.getElementById("root")!);

app.render(<App />);
