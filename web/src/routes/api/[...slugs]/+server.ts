import app from "../../../backend"

declare global {
	interface Request {
		platform?: App.Platform
	}
}

export const fallback = ({ request, platform }) => {
	request.platform = platform

	return app.handle(request)
}
