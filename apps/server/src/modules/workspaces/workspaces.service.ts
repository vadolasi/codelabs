import { eq } from "drizzle-orm";
import { db } from "../../db";
import { workspaceTable } from "../../db/schema";

export default class WorkspacesService {
  async createWorkspace({
    name,
    userId,
    courseId,
  }: { name: string; userId: string; courseId: string }) {
    const [{ id }] = await db
      .insert(workspaceTable)
      .values({ name, userId, courseId })
      .returning({ id: workspaceTable.id });

    return id;
  }

  async getWorkspace({ id }: { id: string }) {
    return db.query.workspaceTable.findFirst({
      where: eq(workspaceTable.id, id),
    });
  }
}
