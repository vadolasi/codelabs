import { treaty } from "@elysiajs/eden";
import { Packr } from "msgpackr";
import type { App } from "server/src";
import { navigate } from "wouter/use-browser-location";

const packr = new Packr({ moreTypes: true });

const client = treaty<App>(window.location.origin, {
  headers: {
    accept: "application/x-msgpack",
  },
  onRequest: (_path, { body }) => {
    if (typeof body === "object") {
      return {
        headers: {
          "content-type": "application/x-msgpack",
        },
        body: packr.pack(body),
      };
    }
  },
  onResponse: (response) => {
    if (response.status === 401) {
      navigate("/auth/login");
    }

    if (
      response.headers.get("Content-Type")?.startsWith("application/x-msgpack")
    ) {
      return response
        .arrayBuffer()
        .then((buffer) => packr.unpack(new Uint8Array(buffer)));
    }
  },
});

export default client;
