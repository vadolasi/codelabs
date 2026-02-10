import app from "../../../backend"

export const fallback = ({ request }) => app.handle(request)
