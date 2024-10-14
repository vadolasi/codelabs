import { eq } from "drizzle-orm";
import db from "../../db";
import { conferenceTable } from "../../db/schema";

export default class WorkspacesService {
  async createWorkspace({
    name,
    courseId,
  }: { name: string; userId: string; courseId: string }) {
    const [{ id }] = await db
      .insert(conferenceTable)
      .values({ name, courseId })
      .returning({ id: conferenceTable.id });

    return id;
  }

  async getWorkspace({ id }: { id: string }) {
    return db.query.conferenceTable.findFirst({
      where: eq(conferenceTable.id, id),
    });
  }
}
