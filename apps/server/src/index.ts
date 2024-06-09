import { Elysia } from "elysia";
import { msgpack } from "elysia-msgpack";
import serverTiming from "@elysiajs/server-timing";
import { usersController } from "./modules/users/users.controller";
import { helmet } from "elysia-helmet";
import { verifyRequestOrigin } from "oslo/request";
import { randomUUID } from "node:crypto";
import { HTTPError } from "./error";

const app = new Elysia({
	cookie: {
		sameSite: "strict",
		secure: true,
		httpOnly: true,
	},
	prefix: "/api",
})
	.use(msgpack())
	.error({
		HTTPError,
	})
	.onError(({ code, error, set }) => {
		switch (code) {
			case "HTTPError":
				set.status = error.status;
				return error.message;
		}
	})
	.use(helmet())
	.use(serverTiming())
	.guard(
		{
			beforeHandle: ({ request, headers, error, set, cookie: { csrf } }) => {
				if (request.method === "OPTIONS") {
				} else if (request.method === "GET") {
					const csrfToken = randomUUID();
					set.headers["X-CSRF-Token"] = csrfToken;
					csrf.set({
						value: csrfToken,
						expires: new Date(Date.now() + 1000 * 60 * 60),
					});
				} else if (
					!headers.origin ||
					!headers.host ||
					!verifyRequestOrigin(headers.origin, [headers.host]) ||
					headers["X-CSRF-Token"] !== csrf.value
				) {
					// return error(403, "Invalid origin")
				}
			},
		},
		(app) => app.use(usersController),
	)
	.listen(3000);

export type App = typeof app;

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
