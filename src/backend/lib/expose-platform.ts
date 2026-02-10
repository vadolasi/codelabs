import { Elysia } from "elysia"

const exposePlatform = new Elysia().derive({ as: "scoped" }, ({ request }) => {
  if (!request.platform) {
    throw new Error("Platform not found on request")
  }

  return {
    platform: request.platform
  }
})

export default exposePlatform
