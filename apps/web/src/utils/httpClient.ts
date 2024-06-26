import { treaty } from "@elysiajs/eden";
import { pack, unpack } from "msgpackr";
import type { App } from "server/src";
import router from "./router";

const client = treaty<App>(window.location.origin, {
  fetch: {
    credentials: "include",
  },
  headers: {
    accept: "application/x-msgpack",
  },
  onRequest: async (_path, { body }) => {
    if (typeof body === "object") {
      return {
        headers: {
          "content-type": "application/x-msgpack",
        },
        body: pack(body),
      };
    }
  },
  onResponse: async (response) => {
    if (response.status === 401) {
      router.navigate("/auth/login");
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
