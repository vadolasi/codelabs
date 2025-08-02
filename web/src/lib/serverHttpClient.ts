import { type Treaty, treaty } from "@elysiajs/eden"
import app from "backend"

const getServerHttpClient = (headers: Treaty.Config["headers"] = {}) => {
	const { api: serverHttpClient } = treaty(app, {
		headers
	})

	return serverHttpClient
}

export default getServerHttpClient
