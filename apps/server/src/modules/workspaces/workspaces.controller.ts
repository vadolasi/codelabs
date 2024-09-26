import { cron } from "@elysiajs/cron";
import Elysia, { t } from "elysia";
import { Loro } from "loro-crdt";
import { unpack } from "msgpackr";
import { rateLimit } from "../../utils/rateLimit";
import authMiddleware from "../auth/auth.middleware";

const workspaces = new Map<string, { loro: Loro; other: unknown }>();

interface WorkspaceEventLoro {
  action: "loro";
  data: Uint8Array;
}

interface WorkspaceEventUserJoin {
  action: "userJoin" | "userLeft";
  data: {
    user: {
      id: string;
      name: string;
    };
  };
}

interface PresenceChanged {
  action: "presenceChanged";
  data: {
    user: {
      id: string;
      name: string;
    };
    currentFile: string;
    cursor: {
      initLine: number;
      initColumn: number;
      endLine: number;
      endColumn: number;
    } | null;
  };
}

export type WorkspaceEvent =
  | WorkspaceEventLoro
  | WorkspaceEventUserJoin
  | PresenceChanged;

export const workspacesController = new Elysia({ prefix: "/workspaces" })
  .use(authMiddleware)
  .guard({ isSignIn: true })
  .use(rateLimit("logged"))
  .use(
    cron({
      name: "saveWorkspaces",
      pattern: "* * * * *",
      run() {
        for (const [id, workspace] of workspaces) {
          //TODO: Add a way to save the workspace to the database
        }
      },
    }),
  )
  .put(
    "/:id/:userId",
    ({ params }) => {
      let doc: Loro;

      if (workspaces.has(`${params.id}:${params.userId}`)) {
        doc = workspaces.get(`${params.id}:${params.userId}`)!.loro;
      } else {
        doc = new Loro();

        const tree = doc.getTree("fileTree");

        if (tree.nodes().length === 0) {
          const root = tree.createNode();
          root.data.set("name", "/");
          root.data.set("isFolder", true);
        }

        doc.commit();
        workspaces.set(`${params.id}:${params.userId}`, {
          loro: doc,
          other: null,
        });
      }

      return doc.exportSnapshot();
    },
    {
      params: t.Object({ id: t.String(), userId: t.String() }),
    },
  )
  .ws("/:id", {
    body: t.Uint8Array(),
    response: t.Uint8Array(),
    params: t.Object({ id: t.String() }),
    open(ws) {
      ws.subscribe(ws.data.params.id);
    },
    message(ws, body) {
      const data = unpack(body) as WorkspaceEvent;

      switch (data.action) {
        case "loro":
          workspaces.get(ws.data.params.id)!.loro.import(data.data);
          break;
      }

      ws.raw.publish(ws.data.params.id, body);
    },
  })
  .ws("/:id/:userId", {
    body: t.Uint8Array(),
    response: t.Uint8Array(),
    params: t.Object({ id: t.String(), userId: t.String() }),
    open(ws) {
      ws.subscribe(`${ws.data.params.id}:${ws.data.params.userId}`);
    },
    message(ws, body) {
      const data = unpack(body) as WorkspaceEvent;

      switch (data.action) {
        case "loro":
          workspaces
            .get(`${ws.data.params.id}:${ws.data.params.userId}`)!
            .loro.import(data.data);
          break;
      }

      ws.raw.publish(`${ws.data.params.id}:${ws.data.params.userId}`, body);
    },
  });
