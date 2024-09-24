import { createRoot } from "react-dom/client";

import "./index.css";
import { RouterProvider } from "react-router-dom";
import router from "./utils/router";

const app = createRoot(document.getElementById("root")!);

app.render(<RouterProvider router={router} />);
