import { and, eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { Redis } from "ioredis";
import { Loro } from "loro-crdt";
import { unpack } from "msgpackr";
import db from "../../db";
import { workspaceDataTable } from "../../db/schema";
import env from "../../env";
import { HTTPError } from "../../error";
import { rateLimit } from "../../utils/rateLimit";
import authMiddleware from "../auth/auth.middleware";

const redis = new Redis(env.REDIS_URL);

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
  .put(
    "/:conferenceId/:id",
    async ({ params }) => {
      const doc = new Loro();

      const workspace = await db.query.workspaceTable.findFirst({
        where: (workspace, { eq }) => eq(workspace.id, params.id),
        with: {
          members: true,
          conference: {
            with: {
              course: {
                with: {
                  members: true,
                },
              },
            },
          },
        },
      });

      if (
        !workspace ||
        (workspace.conference &&
          !workspace.conference.course.members.find(
            (m) => m.userId === workspace.members[0].userId,
          ))
      ) {
        throw new HTTPError(404, "Workspace not found");
      }

      const saved = await db.query.workspaceDataTable.findMany({
        where: (workspaceData, { and, eq }) =>
          and(
            eq(workspaceData.type, "loro"),
            eq(workspaceData.workspaceId, params.id),
          ),
      });

      if (saved) {
        doc.detach();
        doc.importUpdateBatch(saved.map((s) => Buffer.from(s.data, "base64")));
        const snapshot = doc.exportSnapshot();
        await db.transaction(async (db) => {
          await db
            .delete(workspaceDataTable)
            .where(
              and(
                eq(workspaceDataTable.type, "loro"),
                eq(workspaceDataTable.workspaceId, params.id),
              ),
            );
          await db.insert(workspaceDataTable).values({
            type: "loro",
            workspaceId: params.id,
            data: btoa(Buffer.from(snapshot).toString("base64")),
          });
        });

        return snapshot;
      }

      const tree = doc.getTree("fileTree");
      const root = tree.createNode();
      root.data.set("name", "/");
      root.data.set("isFolder", true);

      doc.commit();
      const snapshot = doc.exportSnapshot();
      await db.insert(workspaceDataTable).values({
        type: "loro",
        workspaceId: params.id,
        data: btoa(Buffer.from(snapshot).toString("base64")),
      });

      return snapshot;
    },
    {
      params: t.Object({ id: t.String(), userId: t.String() }),
    },
  )
  .ws("/:conferenceId/:id", {
    body: t.Uint8Array(),
    response: t.Uint8Array(),
    params: t.Object({ id: t.String(), userId: t.String() }),
    perMessageDeflate: true,
    open(ws) {
      ws.subscribe(`${ws.data.params.id}:${ws.data.params.userId}`);
    },
    async message(ws, body) {
      const data = unpack(body) as WorkspaceEvent;

      ws.raw.publish(`${ws.data.params.id}:${ws.data.params.userId}`, body);

      switch (data.action) {
        case "loro":
          await redis.lpush(
            `loro:${ws.data.params.id}:${ws.data.params.userId}`,
            Buffer.from(data.data),
          );
          break;
      }
    },
  });
