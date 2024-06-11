import { treaty } from "@elysiajs/eden";
import type { App } from "server/src";
import { pack, unpack } from "msgpackr";

function setWithExpiry(key: string, value: string, ttl: number) {
	const now = new Date();

	const item = {
		value: value,
		expiry: now.getTime() + ttl,
	};

	sessionStorage.setItem(key, JSON.stringify(item));
}

function getWithExpiry(key: string) {
	const itemStr = sessionStorage.getItem(key);
	if (!itemStr) {
		return null;
	}
	const item = JSON.parse(itemStr);
	const now = new Date();
	if (now.getTime() > item.expiry) {
		sessionStorage.removeItem(key);
		return null;
	}
	return item.value;
}

const client = treaty<App>(window.location.origin, {
	fetch: {
		credentials: "include",
	},
	headers: {
		accept: "application/x-msgpack",
	},
	onRequest: async (_path, { body, method }) => {
		if (method !== "GET" && !getWithExpiry("csrfToken")) {
			await client.api.csrf.get();
		}

		if (typeof body === "object") {
			return {
				headers: {
					"content-type": "application/x-msgpack",
					"x-csrf-token": getWithExpiry("csrfToken"),
				},
				body: pack(body),
			};
		}

		return {
			headers: {
				"content-type": "text/plain",
				"x-csrf-token": getWithExpiry("csrfToken"),
			},
		};
	},
	onResponse: async (response) => {
		const csrfToken = response.headers.get("X-CSRF-Token");

		if (csrfToken) {
			setWithExpiry("csrfToken", csrfToken, 1000 * 60 * 60);
		}

		if (
			response.headers.get("Content-Type")?.startsWith("application/x-msgpack")
		) {
			return response
				.arrayBuffer()
				.then((buffer) => unpack(new Uint8Array(buffer)));
		}
	},
});

export default client;
