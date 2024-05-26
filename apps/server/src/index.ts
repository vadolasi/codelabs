import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import { msgpack } from "elysia-msgpack"
import serverTiming from "@elysiajs/server-timing"
import { usersController } from "./modules/users/users.controller"

const app = new Elysia()
  .use(cors({ origin: "*", credentials: true }))
  .use(serverTiming())
  .use(msgpack())
  .use(usersController)
  .listen(3000)

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
)
