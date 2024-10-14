import serverTiming from "@elysiajs/server-timing";
import { Elysia } from "elysia";
import { helmet } from "elysia-helmet";
import { ip } from "elysia-ip";
import { Packr } from "msgpackr";
import env from "./env";
import { HTTPError } from "./error";
import { authController } from "./modules/auth/auth.controller";
import authMiddleware from "./modules/auth/auth.middleware";
import { conferencesController } from "./modules/conferences/conferences.controller";
import { coursesController } from "./modules/courses/courses.controller";
import { usersController } from "./modules/users/users.controller";
import { workspacesController } from "./modules/workspaces/workspaces.controller";

const app = new Elysia({
  cookie: {
    sameSite: "strict",
    secure: env.NODE_ENV === "production",
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
  .use(helmet())
  .decorate("msgpack", new Packr({ moreTypes: true }))
  .onParse(async ({ request, msgpack }, contentType) => {
    if (contentType === "application/x-msgpack") {
      return msgpack.unpack(Buffer.from(await request.arrayBuffer()));
    }
  })
  .mapResponse(({ response, set, msgpack }) => {
    if (response && typeof response === "object") {
      set.headers["content-type"] = "application/x-msgpack";
      set.headers["content-encoding"] = "gzip";

      return Bun.gzipSync(msgpack.pack(response), { level: 9 });
    }

    set.headers["content-type"] = "text/plain; charset=utf-8";

    return response;
  })
  .error({ HTTPError })
  .onError(({ code, error, set }) => {
    if (code === "HTTPError") {
      set.status = error.status;
    }

    return error.message;
  })
  .use(authMiddleware)
  .use(authController)
  .use(usersController)
  .use(coursesController)
  .use(conferencesController)
  .use(workspacesController)
  .get("/status", () => "OK")
  .listen(3000);

if (env.NODE_ENV !== "production") {
  app.use(serverTiming());
}

export type App = typeof app;

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
