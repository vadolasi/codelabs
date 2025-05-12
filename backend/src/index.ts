import { Elysia } from "elysia"

const app = new Elysia({ prefix: "/api" })
	.get("/", () => "Hello Elysia")
	.listen(3000)

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)
