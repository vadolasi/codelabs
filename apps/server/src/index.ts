import serverTiming from "@elysiajs/server-timing";
import { Elysia } from "elysia";
// import { compression } from "elysia-compress";
import { helmet } from "elysia-helmet";
import { ip } from "elysia-ip";
import { msgpack } from "elysia-msgpack";
import env from "./env";
import { HTTPError } from "./error";
import { authController } from "./modules/auth/auth.controller";
import authMiddleware from "./modules/auth/auth.middleware";
import { coursesController } from "./modules/courses/courses.controller";
import { usersController } from "./modules/users/users.controller";
import { workspacesController } from "./modules/workspaces/workspaces.controller";

const app = new Elysia({
  cookie: {
    sameSite: "strict",
    secure: env.NODE_ENV === "PRODUCTION",
    httpOnly: true,
    sign: true,
    secrets: [env.COOKIE_SECRET_1, env.COOKIE_SECRET_2, env.COOKIE_SECRET_3],
  },
  prefix: "/api",
  serve: {
    maxRequestBodySize: 1024 * 1024,
  },
})
  .use(ip())
  .use(msgpack({ moreTypes: true }))
  .error({
    HTTPError,
  })
  // .use(compression())
  .onError(({ code, error, set }) => {
    switch (code) {
      case "HTTPError":
        set.status = error.status;
        return error.message;
    }
  })
  .use(helmet())
  .use(authMiddleware)
  .use(authController)
  .use(usersController)
  .use(coursesController)
  .use(workspacesController)
  .get("/status", () => "OK")
  .listen(3000);

if (env.NODE_ENV !== "PRODUCTION") {
  app.use(serverTiming());
}

export type App = typeof app;

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
