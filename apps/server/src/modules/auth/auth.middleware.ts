import Elysia, { error } from "elysia";
import type { Session, User } from "lucia";
import { verifyRequestOrigin } from "oslo/request";
import { lucia } from "./auth.utils";

const authMiddleware = new Elysia()
  .derive(
    { as: "scoped" },
    async (
      context,
    ): Promise<{
      user: User | null;
      session: Session | null;
    }> => {
      if (context.request.method !== "GET") {
        const originHeader = context.request.headers.get("Origin");
        const hostHeader = context.request.headers.get("Host");
        if (
          !originHeader ||
          !hostHeader ||
          !verifyRequestOrigin(originHeader, [hostHeader])
        ) {
          return {
            user: null,
            session: null,
          };
        }
      }

      const { session, user } = await lucia.validateSession(
        context.cookie.session?.value || "",
      );
      if (session?.fresh) {
        const sessionCookie = lucia.createSessionCookie(session.id);
        context.cookie[sessionCookie.name].set({
          value: sessionCookie.value,
          ...sessionCookie.attributes,
        });
      }
      if (!session) {
        const sessionCookie = lucia.createBlankSessionCookie();
        context.cookie[sessionCookie.name].set({
          value: sessionCookie.value,
          ...sessionCookie.attributes,
        });
      }
      return {
        user,
        session,
      };
    },
  )
  .macro(({ onBeforeHandle }) => ({
    isSignIn(_value: boolean) {
      onBeforeHandle(({ user }) => {
        if (!user || !user.emailVerified) {
          error(401, "Unauthorized");
        }
      });
    },
  }));

export default authMiddleware;
