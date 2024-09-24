import { eq } from "drizzle-orm";
import { db } from "../../db";
import { courseTable, membersTable } from "../../db/schema";

export default class CoursesService {
  async createWorkspace({ name, userId }: { name: string; userId: string }) {
    const id = await db.transaction(async (db) => {
      const [{ id }] = await db
        .insert(courseTable)
        .values({ name })
        .returning({ id: courseTable.id });

      await db
        .insert(membersTable)
        .values({ role: "owner", userId, workspaceId: id, type: "workspace" });
      return id;
    });

    return id;
  }

  async getWorkspace({ id }: { id: string }) {
    return db.query.workspaceTable.findFirst({ where: eq(courseTable.id, id) });
  }
}
