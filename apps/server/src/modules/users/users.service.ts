import { refreshTokens, users } from "./schema";
import { db } from "../../db";
import jwt from "jsonwebtoken";
import { HTTPError } from "../../error";
import EmailConfirmationEmail from "transactional/emails/EmailConfirmation";
import ResetPasswordEmail from "transactional/emails/ResetPassword";
import { Resend } from "resend";
import { eq } from "drizzle-orm";
import env from "../../env";
import _ from "lodash";

const resend = new Resend(env.RESEND_API_KEY);

async function sendEmail(email: string) {
	const token = await new Promise<string>((resolve, reject) => {
		jwt.sign(
			{ email, emailConfirmation: true },
			env.JWT_SECRET,
			(err: Error | null, token: string | undefined) => {
				if (err || !token) {
					reject(err);
				} else {
					resolve(token);
				}
			},
		);
	});

	const link = `${env.URL}/auth/confirm-email/?token=${token}`;

	const { error } = await resend.emails.send({
		from: "Codelabs <codelabs@vitordaniel.com>",
		to: email,
		subject: "Confirme seu email",
		react: EmailConfirmationEmail({ link }),
	});

	if (error) {
		throw new HTTPError(500, "Error sending email");
	}
}

export async function register({
	email,
	username,
	password,
}: { email: string; username: string; password: string }) {
	const [{ id }] = await db
		.insert(users)
		.values({
			email,
			username,
			password: await Bun.password.hash(`${password}:${env.PASSWORD_PEPPER}`),
		})
		.returning({ id: users.id });

	await sendEmail(email);

	return id;
}

export async function resendEmail({
	emailOrUsername,
}: { emailOrUsername: string }) {
	const user = await db.query.users.findFirst({
		where: (user, { eq, or }) =>
			or(eq(user.email, emailOrUsername), eq(user.username, emailOrUsername)),
	});

	if (!user) {
		throw new HTTPError(404, "User not found");
	}

	if (user.emailConfirmed) {
		throw new HTTPError(400, "Email already confirmed");
	}

	await sendEmail(user.email);
}

export async function confirmEmail({ token }: { token: string }) {
	let email: string;

	try {
		const payload = jwt.verify(token, env.JWT_SECRET) as {
			email: string;
			emailConfirmation: boolean;
		};

		if (!payload.emailConfirmation) {
			throw new HTTPError(400, "Invalid token");
		}

		email = payload.email;
	} catch (err) {
		if (err instanceof jwt.TokenExpiredError) {
			throw new HTTPError(401, "Invalid or expired token");
		}

		throw new HTTPError(400, "Invalid token");
	}

	const user = await db.query.users.findFirst({
		where: (user, { eq }) => eq(user.email, email),
	});

	if (!user) {
		throw new HTTPError(400, "Invalid token");
	}

	await db
		.update(users)
		.set({ emailConfirmed: true })
		.where(eq(users.id, user.id));
}

export async function checkEmail({ email }: { email: string }) {
	return (
		(await db.query.users.findFirst({
			where: (user, { eq }) => eq(user.email, email),
		})) !== null
	);
}

export async function checkUsername({ username }: { username: string }) {
	return (
		(await db.query.users.findFirst({
			where: (user, { eq }) => eq(user.username, username),
		})) !== null
	);
}

export async function login({
	emailOrUsername,
	password,
}: { emailOrUsername: string; password: string }) {
	const user = await db.query.users.findFirst({
		where: (user, { eq, or }) =>
			or(eq(user.email, emailOrUsername), eq(user.username, emailOrUsername)),
	});

	if (!user) {
		throw new HTTPError(401, "Invalid email or password");
	}

	if (!user.emailConfirmed) {
		throw new HTTPError(401, "Email not confirmed");
	}

	if (
		(await Bun.password.verify(
			`${password}:${env.PASSWORD_PEPPER}`,
			user.password,
		)) === false
	) {
		throw new HTTPError(401, "Invalid email or password");
	}

	const token = await new Promise<string>((resolve, reject) => {
		jwt.sign(
			{ id: user.id },
			env.JWT_SECRET,
			(err: Error | null, token: string | undefined) => {
				if (err || !token) {
					reject(err);
				} else {
					resolve(token);
				}
			},
		);
	});

	const [{ id: refreshToken }] = await db
		.insert(refreshTokens)
		.values({
			userId: user.id,
			expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
		})
		.returning({ id: refreshTokens.id });

	return { token, refreshToken, user: _.omit(user, ["password"]) };
}

export async function refreshToken({
	refreshToken: refreshTokenStr,
}: { refreshToken: string }) {
	const refreshTokenObj = await db.query.refreshTokens.findFirst({
		where: (refreshToken, { eq }) => eq(refreshToken.id, refreshTokenStr),
	});

	if (!refreshTokenObj || refreshTokenObj.expiresAt.getTime() < Date.now()) {
		throw new HTTPError(401, "Invalid refresh token");
	}

	const token = await new Promise<string>((resolve, reject) => {
		jwt.sign(
			{ id: refreshTokenObj.userId },
			env.JWT_SECRET,
			(err: Error | null, token: string | undefined) => {
				if (err || !token) {
					reject(err);
				} else {
					resolve(token);
				}
			},
		);
	});

	return { token };
}

export async function forgotPassword({
	emailOrUsername,
}: { emailOrUsername: string }) {
	const user = await db.query.users.findFirst({
		where: (user, { eq, or }) =>
			or(eq(user.email, emailOrUsername), eq(user.username, emailOrUsername)),
	});

	if (!user) {
		throw new HTTPError(404, "User not found");
	}

	const token = await new Promise<string>((resolve, reject) => {
		jwt.sign(
			{ id: user.id, resetPassword: true },
			env.JWT_SECRET,
			(err: Error | null, token: string | undefined) => {
				if (err || !token) {
					reject(err);
				} else {
					resolve(token);
				}
			},
		);
	});

	const link = `${env.URL}/auth/reset-password/?token=${token}`;

	const { error } = await resend.emails.send({
		from: "Codelabs <codelabs@vitordaniel.com>",
		to: user.email,
		subject: "Redefinir senha",
		react: ResetPasswordEmail({ link }),
	});

	if (error) {
		throw new HTTPError(500, "Error sending email");
	}
}

export async function checkResetPasswordToken({ token }: { token: string }) {
	try {
		const payload = jwt.verify(token, env.JWT_SECRET) as {
			id: string;
			resetPassword: boolean;
		};

		if (!payload.resetPassword) {
			throw new HTTPError(400, "Invalid token");
		}

		return payload.id;
	} catch (err) {
		if (err instanceof jwt.TokenExpiredError) {
			throw new HTTPError(401, "Invalid or expired token");
		}

		throw new HTTPError(400, "Invalid token");
	}
}

export async function resetPassword({
	token,
	password,
}: { token: string; password: string }) {
	const id = await checkResetPasswordToken({ token });

	await db
		.update(users)
		.set({
			password: await Bun.password.hash(`${password}:${env.PASSWORD_PEPPER}`),
		})
		.where(eq(users.id, id));
}

export default {
	register,
	resendEmail,
	confirmEmail,
	checkEmail,
	checkUsername,
	login,
	refreshToken,
	forgotPassword,
	checkResetPasswordToken,
	resetPassword,
};
