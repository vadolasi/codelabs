import Elysia, { t } from "elysia";
import { Loro } from "loro-crdt";
import { rateLimit } from "../../utils/rateLimit";
import authMiddleware from "../auth/auth.middleware";

const workspaces = new Map<string, Loro>();

setInterval(() => {
  for (const [id, workspace] of workspaces) {
    //TODO: Add a way to save the workspace to the database
  }
}, 1000 * 60);

export const workspacesController = new Elysia({ prefix: "workspaces" })
  .use(authMiddleware)
  .guard({ isSignIn: true })
  .use(rateLimit("logged"))
  .put(
    "/:id/:userId",
    ({ params }) => {
      let doc: Loro;

      if (workspaces.has(params.id)) {
        // biome-ignore lint/style/noNonNullAssertion: Already checked
        doc = workspaces.get(params.id)!;
      } else {
        doc = new Loro();

        const tree = doc.getTree("fileTree");

        if (tree.nodes().length === 0) {
          const root = tree.createNode();
          root.data.set("name", "/");
          root.data.set("isFolder", true);
        }

        doc.commit();
        workspaces.set(params.id, doc);
      }

      return doc.exportSnapshot();
    },
    {
      params: t.Object({ id: t.String(), userId: t.String() }),
    },
  )
  .ws("/:id/:userId", {
    body: t.Uint8Array(),
    response: t.Uint8Array(),
    params: t.Object({ id: t.String(), userId: t.String() }),
    open(ws) {
      ws.subscribe(`${ws.data.params.id}:${ws.data.params.userId}`);
    },
    message(ws, body) {
      // biome-ignore lint/style/noNonNullAssertion: Already checked
      workspaces.get(ws.data.params.id)!.import(body);
      ws.raw.publish(`${ws.data.params.id}:${ws.data.params.userId}`, body);
    },
  });
