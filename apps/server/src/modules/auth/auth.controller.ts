import Elysia, { t } from "elysia";
import { rateLimit } from "../../utils/rateLimit";
import authMiddleware from "./auth.middleware";
import AuthService from "./auth.service";

export const authController = new Elysia({ prefix: "/auth" })
  .decorate({ authService: new AuthService() })
  .use(authMiddleware)
  .guard((guard) =>
    guard
      .use(rateLimit("not_logged_email"))
      .post(
        "/resent-email-confirmation",
        async ({
          authService,
          body: { email },
          cookie: { session: sessionCookie },
        }) => {
          const cookie = await authService.resendEmail({ email });

          sessionCookie.set({
            value: cookie.value,
            expires: cookie.attributes.expires,
            maxAge: cookie.attributes.maxAge,
          });

          return "Email confirmation resent";
        },
        {
          body: t.Object({ email: t.String() }),
          cookie: t.Object({ session: t.String() }),
        },
      )
      .post(
        "/reset-password",
        async ({ authService, body: { email } }) => {
          await authService.sendPasswordResetToken({ email });

          return "Email sent";
        },
        { body: t.Object({ email: t.String() }) },
      ),
  )
  .guard((guard) =>
    guard
      .use(rateLimit("not_logged"))
      .post(
        "/login",
        async ({
          authService,
          body: { email, password },
          cookie: { session: sessionCookie },
        }) => {
          const { user, cookie } = await authService.login({
            email,
            password,
          });

          sessionCookie.set({
            value: cookie.value,
            expires: cookie.attributes.expires,
            maxAge: cookie.attributes.maxAge,
          });

          return user;
        },
        {
          body: t.Object({
            email: t.String(),
            password: t.String(),
          }),
        },
      )
      .post(
        "/confirm-email",
        async ({ authService, body: { code }, user }) => {
          await authService.confirmEmail({ code, user });

          return "Email confirmed";
        },
        { body: t.Object({ code: t.String() }) },
      )
      .post(
        "/reset-password/:token",
        async ({ authService, body: { password }, params: { token }, set }) => {
          await authService.resetPassword({ token, password });

          set.headers["Referrer-Policy"] = "no-referrer";

          return "Token valid";
        },
        {
          params: t.Object({ token: t.String() }),
          body: t.Object({
            password: t.String({
              minLength: 8,
              pattern:
                "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z\\d]).{8,}$",
            }),
          }),
        },
      ),
  )
  .guard((guard) =>
    guard
      .use(rateLimit("logged"))
      .post(
        "/logout",
        async ({
          cookie: { token: tokenCookie, refreshToken: refreshTokenCookie },
        }) => {
          tokenCookie.set({ value: "", expires: new Date(0) });
          refreshTokenCookie.set({ value: "", expires: new Date(0) });

          return "Logged out";
        },
      ),
  );
