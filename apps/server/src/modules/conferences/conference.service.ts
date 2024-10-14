import _ from "lodash";
import db from "../../db";
import { conferenceTable } from "../../db/schema";
import { HTTPError } from "../../error";

export default class ConferencesService {
  async getConference({
    userId,
    courseId,
    id,
  }: { userId: string; courseId: string; id: string }) {
    const conference = await db.query.conferenceTable.findFirst({
      where: (conference, { and, eq }) =>
        and(eq(conference.courseId, courseId), eq(conference.id, id)),
      with: {
        course: {
          with: {
            members: {
              where: (courseMember, { eq }) => eq(courseMember.userId, userId),
            },
          },
        },
      },
    });

    if (!conference || !conference.course.members.length) {
      throw new HTTPError(404, "Course not found");
    }

    return {
      ...conference.course.members[0],
      conference: _.omit(conference, ["course"]),
    };
  }

  async createConference({
    name,
    userId,
    courseId,
  }: { name: string; userId: string; courseId: string }) {
    const member = await db.query.courseMemberTable.findFirst({
      where: (courseMember, { and, eq }) =>
        and(
          eq(courseMember.userId, userId),
          eq(courseMember.courseId, courseId),
        ),
    });

    if (!member) {
      throw new HTTPError(404, "Course not found");
    }

    const [{ id }] = await db
      .insert(conferenceTable)
      .values({ name, courseId })
      .returning({ id: conferenceTable.id });

    return id;
  }
}
