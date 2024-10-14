import { and, count, eq } from "drizzle-orm";
import db from "../../db";
import { courseMemberTable, courseTable } from "../../db/schema";
import { HTTPError } from "../../error";

export default class CoursesService {
  async createCourse({ name, userId }: { name: string; userId: string }) {
    const id = await db.transaction(async (db) => {
      const [{ id }] = await db
        .insert(courseTable)
        .values({ name })
        .returning({ id: courseTable.id });

      await db
        .insert(courseMemberTable)
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
        membersCount: count(courseMemberTable.id),
      })
      .from(courseTable)
      .leftJoin(
        courseMemberTable,
        eq(courseTable.id, courseMemberTable.courseId),
      )
      .where(eq(courseMemberTable.userId, userId))
      .groupBy(courseTable.id);
  }

  async getCourse({ userId, id }: { userId: string; id: string }) {
    const data = await db.query.courseMemberTable.findFirst({
      where: and(
        eq(courseMemberTable.userId, userId),
        eq(courseMemberTable.courseId, id),
      ),
      with: {
        course: {
          with: {
            conferences: true,
          },
        },
      },
    });

    if (!data) {
      throw new HTTPError(404, "Course not found");
    }

    return data;
  }
}
