import Elysia, { t } from "elysia";
import { rateLimit } from "../../utils/rateLimit";
import authMiddleware from "../auth/auth.middleware";
import CoursesService from "./courses.service";

const coursesService = new CoursesService();

export const coursesController = new Elysia({ prefix: "/courses" })
  .use(authMiddleware)
  .guard({ isSignIn: true })
  .use(rateLimit("logged"))
  .get("/", async ({ user }) => {
    return coursesService.getCourses({ userId: user!.id });
  })
  .get("/:id", async ({ params, user }) => {
    return coursesService.getCourse({ userId: user!.id, id: params.id });
  })
  .post(
    "/",
    async ({ body, user }) => {
      return coursesService.createCourse({ userId: user!.id, name: body.name });
    },
    {
      body: t.Object({
        name: t.String(),
      }),
    },
  );
