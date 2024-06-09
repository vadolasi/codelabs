import Elysia, { t } from "elysia";
import UsersService from "./users.service";

export const usersController = new Elysia()
	.decorate({ usersService: UsersService })
	.group("/auth", (group) =>
		group
			.post(
				"/register",
				({ usersService, body: { email, username, password } }) =>
					usersService.register({ email, username, password }),
				{
					body: t.Object({
						email: t.String(),
						username: t.String(),
						password: t.String(),
					}),
				},
			)
			.post(
				"/login",
				async ({
					usersService,
					body: { emailOrUsername, password },
					cookie: { token: tokenCookie, refreshToken: refreshTokenCookie },
				}) => {
					const { token, refreshToken, user } = await usersService.login({
						emailOrUsername,
						password,
					});

					tokenCookie.set({
						value: token,
						expires: new Date(Date.now() + 1000 * 60 * 15),
					});
					refreshTokenCookie.set({
						value: refreshToken,
						expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
					});

					return user;
				},
				{
					body: t.Object({ emailOrUsername: t.String(), password: t.String() }),
				},
			)
			.post(
				"/refresh-token",
				async ({
					usersService,
					cookie: { token: tokenCookie, refreshToken: refreshTokenCookie },
				}) => {
					const { token } = await usersService.refreshToken({
						refreshToken: refreshTokenCookie.value,
					});

					tokenCookie.set({
						value: token,
						expires: new Date(Date.now() + 1000 * 60 * 60),
					});

					return "Token refreshed";
				},
			)
			.post(
				"/resent-email-confirmation",
				async ({ usersService, body: { emailOrUsername } }) => {
					await usersService.resendEmail({ emailOrUsername });

					return "Email confirmation resent";
				},
				{ body: t.Object({ emailOrUsername: t.String() }) },
			)
			.post(
				"/confirm-email",
				async ({ usersService, body: { token } }) => {
					await usersService.confirmEmail({ token });

					return "Email confirmed";
				},
				{ body: t.Object({ token: t.String() }) },
			)
			.post(
				"/forgot-password",
				async ({ usersService, body: { emailOrUsername } }) => {
					await usersService.forgotPassword({ emailOrUsername });

					return "Email sent";
				},
				{ body: t.Object({ emailOrUsername: t.String() }) },
			)
			.post(
				"/check-forgot-password-token",
				async ({ usersService, body: { token } }) => {
					await usersService.checkResetPasswordToken({ token });

					return "Token valid";
				},
				{ body: t.Object({ token: t.String() }) },
			)
			.post(
				"/reset-password",
				async ({ usersService, body: { token, password } }) => {
					await usersService.resetPassword({ token, password });

					return "Password reset";
				},
				{ body: t.Object({ token: t.String(), password: t.String() }) },
			),
	)
	.group("/users/check", (group) =>
		group
			.get(
				"/email",
				({ usersService, query: { email } }) =>
					usersService.checkEmail({ email }),
				{ query: t.Object({ email: t.String() }) },
			)
			.get(
				"/username",
				({ usersService, query: { username } }) =>
					usersService.checkUsername({ username }),
				{ query: t.Object({ username: t.String() }) },
			),
	);
