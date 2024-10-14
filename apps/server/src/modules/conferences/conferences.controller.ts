import Elysia, { t } from "elysia";
import { unpack } from "msgpackr";
import { rateLimit } from "../../utils/rateLimit";
import authMiddleware from "../auth/auth.middleware";
import ConferencesService from "./conference.service";

const conferencessService = new ConferencesService();

export const conferencesController = new Elysia({ prefix: "/conferences" })
  .use(authMiddleware)
  .guard({ isSignIn: true })
  .use(rateLimit("logged"))
  .get(
    "/:courseId/:id",
    async ({ user, params: { courseId, id } }) => {
      return conferencessService.getConference({
        userId: user!.id,
        courseId,
        id,
      });
    },
    {
      params: t.Object({ courseId: t.String(), id: t.String() }),
    },
  )
  .post(
    "/",
    async ({ body, user }) => {
      const { name, courseId } = body;
      return conferencessService.createConference({
        userId: user!.id,
        name,
        courseId,
      });
    },
    {
      body: t.Object({
        name: t.String(),
        courseId: t.String(),
      }),
    },
  )
  .ws("/:courseId/:id", {
    body: t.Uint8Array(),
    response: t.Uint8Array(),
    params: t.Object({ id: t.String() }),
    perMessageDeflate: true,
    open(ws) {
      ws.subscribe(ws.data.params.id);
    },
    message(ws, body) {
      const data = unpack(body);

      switch (data.action) {
        case "userJoin":
          break;
      }

      ws.raw.publish(ws.data.params.id, body);
    },
  });
