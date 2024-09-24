import { eq } from "drizzle-orm";
import { db } from "../../db";
import { membersTable, workspaceTable } from "../../db/schema";

export default class WorkspacesService {
  async createWorkspace({ name, userId }: { name: string; userId: string }) {
    const id = await db.transaction(async (db) => {
      const [{ id }] = await db
        .insert(workspaceTable)
        .values({ name, userId })
        .returning({ id: workspaceTable.id });

      await db
        .insert(membersTable)
        .values({ role: "owner", userId, workspaceId: id, type: "workspace" });

      return id;
    });

    return id;
  }

  async getWorkspace({ id }: { id: string }) {
    return db.query.workspaceTable.findFirst({
      where: eq(workspaceTable.id, id),
    });
  }
}
