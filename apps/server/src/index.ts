import { Elysia } from "elysia";
import { msgpack } from "elysia-msgpack";
import serverTiming from "@elysiajs/server-timing";
import { usersController } from "./modules/users/users.controller";
import { helmet } from "elysia-helmet";
import { verifyRequestOrigin } from "oslo/request";
import { randomUUID } from "node:crypto";
import { HTTPError } from "./error";
import { workspacesController } from "./modules/workspaces/workspaces.controller";
import env from "./env";

const app = new Elysia({
	cookie: {
		sameSite: "strict",
		secure: env.NODE_ENV === "PRODUCTION",
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
	.onBeforeHandle(({ request, headers, error, set, cookie: { csrf } }) => {
		if (request.method === "GET") {
			const csrfToken = randomUUID();
			set.headers["X-CSRF-Token"] = csrfToken;
			csrf.set({
				value: csrfToken,
				expires: new Date(Date.now() + 1000 * 60 * 60),
			});
		} else if (
			!["HEAD", "OPTIONS"].includes(request.method) &&
			(!headers.origin ||
				!headers.host ||
				!verifyRequestOrigin(headers.origin, [headers.host]) ||
				headers["x-csrf-token"] !== csrf.value)
		) {
			return error(403, "Invalid origin");
		}
	})
	.use(usersController)
	.use(workspacesController)
	.get("/csrf", () => {
		return "CSRF token set";
	})
	.listen(3000);

if (env.NODE_ENV !== "PRODUCTION") {
	app.use(serverTiming());
}

export type App = typeof app;

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
