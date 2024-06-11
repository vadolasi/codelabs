import Elysia from "elysia";
import { createVerifier, TokenError } from "fast-jwt";
import env from "./env";

export const authMiddleware = new Elysia()
	.decorate({
		verify: createVerifier({ key: async () => env.JWT_SECRET, cache: true }),
	})
	.resolve({ as: "scoped" }, async ({ cookie: { token }, error, verify }) => {
		if (!token) {
			return error(401, "Unauthorized");
		}

		try {
			const payload = (await verify(token.value)) as {
				id: string;
				email: string;
				username: string;
			};

			return { user: payload };
		} catch (err) {
			if (error instanceof TokenError) {
				if (error.code === "FAST_JWT_EXPIRED") {
					return error(401, "Invalid or expired token");
				}
			}
		}

		return error(401, "Unauthorized");
	});
