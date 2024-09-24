import { createBrowserRouter } from "react-router-dom";
import routes from "~react-pages";
import App from "../root";

const router = createBrowserRouter([{ element: <App />, children: routes }]);

export default router;
