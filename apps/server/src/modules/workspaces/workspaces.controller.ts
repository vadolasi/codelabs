import Elysia, { t } from "elysia";
import { authMiddleware } from "../../middleware";
import { Loro } from "loro-crdt";

const workspaces = new Map<string, Loro>();

setInterval(() => {
	for (const [id, workspace] of workspaces) {
		//TODO: Add a way to save the workspace to the database
	}
}, 1000 * 60);

export const workspacesController = new Elysia({ prefix: "workspaces" })
	.use(authMiddleware)
	.ws("/ws/:id", {
		body: t.Uint8Array(),
		response: t.Uint8Array(),
		params: t.Object({ id: t.String() }),
		open(ws) {
			ws.subscribe(ws.data.params.id);

			if (workspaces.has(ws.data.params.id)) {
				// biome-ignore lint/style/noNonNullAssertion: Already checked
				ws.raw.send(workspaces.get(ws.data.params.id)!.exportSnapshot()!);
			} else {
				workspaces.set(ws.data.params.id, new Loro());
			}
		},
		message(ws, body) {
			// biome-ignore lint/style/noNonNullAssertion: Already checked
			workspaces.get(ws.data.params.id)!.import(body);
			ws.raw.publish(ws.data.params.id, body);
		},
	});
