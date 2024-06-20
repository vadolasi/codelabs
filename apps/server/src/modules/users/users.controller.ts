import Elysia, { t } from "elysia";
import { rateLimit } from "../../utils/rateLimit";
import authMiddleware from "../auth/auth.middleware";
import UsersService from "./users.service";

export const usersController = new Elysia({ prefix: "/users" })
  .decorate({ usersService: new UsersService() })
  .use(authMiddleware)
  .guard((guard) =>
    guard.use(rateLimit("not_logged")).post(
      "/register",
      async ({
        usersService,
        body: { email, firstName, lastName, password },
        cookie: { session: sessionCookie },
      }) => {
        const cookie = await usersService.register({
          email,
          firstName,
          lastName,
          password,
        });

        sessionCookie.set({
          value: cookie.value,
          expires: cookie.attributes.expires,
          maxAge: cookie.attributes.maxAge,
        });

        return "User registered";
      },
      {
        body: t.Object({
          email: t.String(),
          firstName: t.String(),
          lastName: t.String(),
          password: t.String(),
        }),
        cookie: t.Object({
          session: t.String(),
        }),
      },
    ),
  )
  .guard((guard) =>
    guard
      .use(rateLimit("not_logged"))
      .get(
        "/check/email",
        ({ usersService, query: { email } }) =>
          usersService.checkEmail({ email }),
        { query: t.Object({ email: t.String() }) },
      ),
  )
  .group("/users", (group) =>
    group
      .use(rateLimit("not_logged"))
      .guard({ isSignIn: true })
      .get("/me", async ({ user }) => {
        return user;
      }),
  );
