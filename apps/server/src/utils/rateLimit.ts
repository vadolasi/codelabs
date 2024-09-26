import type { SocketAddress } from "bun";
import Elysia from "elysia";
import {
  type Generator,
  rateLimit as rateLimitMiddleware,
} from "elysia-rate-limit";
import type { User } from "lucia";

const ipGenerator: Generator<{ ip: SocketAddress }> = (_req, _serv, { ip }) => {
  return ip.address;
};

const userGenerator: Generator<{ user: User | null }> = (
  _req,
  _serv,
  { user },
) => {
  return user?.id ?? "guest";
};

export function rateLimit(
  profile: "not_logged" | "logged" | "not_logged_email" | "logged_email",
) {
  switch (profile) {
    case "not_logged":
      return new Elysia().use(
        rateLimitMiddleware({
          generator: ipGenerator,
          max: 60,
          duration: 60 * 1000,
        }),
      );
    case "logged":
      return new Elysia().use(
        rateLimitMiddleware({
          generator: userGenerator,
          max: 100,
          duration: 60 * 1000,
        }),
      );
    case "not_logged_email":
      return new Elysia().use(
        rateLimitMiddleware({
          generator: ipGenerator,
          max: 10,
          duration: 60 * 60 * 1000,
        }),
      );
    case "logged_email":
      return new Elysia().use(
        rateLimitMiddleware({
          generator: userGenerator,
          max: 10,
          duration: 60 * 1000,
        }),
      );
  }
}
