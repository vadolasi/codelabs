import { and, count, eq } from "drizzle-orm";
import { db } from "../../db";
import { courseTable, membersTable } from "../../db/schema";
import { HTTPError } from "../../error";

export default class CoursesService {
  async createCourse({ name, userId }: { name: string; userId: string }) {
    const id = await db.transaction(async (db) => {
      const [{ id }] = await db
        .insert(courseTable)
        .values({ name })
        .returning({ id: courseTable.id });

      await db
        .insert(membersTable)
        .values({ role: "owner", userId, courseId: id });
      return id;
    });

    return id;
  }

  async getCourses({ userId }: { userId: string }) {
    return db
      .select({
        id: courseTable.id,
        name: courseTable.name,
        membersCount: count(membersTable.id),
      })
      .from(courseTable)
      .leftJoin(membersTable, eq(courseTable.id, membersTable.courseId))
      .where(eq(membersTable.userId, userId))
      .groupBy(courseTable.id)
      .all();
  }

  async getCourse({ userId, id }: { userId: string; id: string }) {
    const data = await db.query.membersTable.findFirst({
      where: and(
        eq(membersTable.userId, userId),
        eq(membersTable.courseId, id),
      ),
      with: {
        course: true,
      },
    });

    if (!data) {
      throw new HTTPError(404, "Course not found");
    }

    return data.course;
  }
}
