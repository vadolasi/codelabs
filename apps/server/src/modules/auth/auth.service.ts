import { eq } from "drizzle-orm";
import _ from "lodash";
import { type User, generateIdFromEntropySize } from "lucia";
import { TimeSpan, createDate, isWithinExpirationDate } from "oslo";
import { alphabet, generateRandomString, sha256 } from "oslo/crypto";
import { encodeHex } from "oslo/encoding";
import { db } from "../../db";
import {
  emailVerificationCodeTable,
  passwordResetTokenTable,
  usersTable,
} from "../../db/schema";
import env from "../../env";
import { HTTPError } from "../../error";
import EmailsService, { templates } from "../email/emails.service";
import { lucia } from "./auth.utils";

export default class AuthService {
  emailsService = new EmailsService();

  async generateEmailVerificationCode(
    userId: string,
    email: string,
  ): Promise<string> {
    await db
      .delete(emailVerificationCodeTable)
      .where(eq(emailVerificationCodeTable.userId, userId));
    const code = generateRandomString(8, alphabet("0-9"));
    await db.insert(emailVerificationCodeTable).values({
      userId,
      email,
      code,
      expiresAt: createDate(new TimeSpan(15, "m")).getTime(),
    });

    return code;
  }

  async createPasswordResetToken(userId: string): Promise<string> {
    await db
      .delete(passwordResetTokenTable)
      .where(eq(passwordResetTokenTable.userId, userId));
    const tokenId = generateIdFromEntropySize(25);
    const tokenHash = encodeHex(
      await sha256(new TextEncoder().encode(tokenId)),
    );
    await db.insert(passwordResetTokenTable).values({
      tokenHash,
      expiresAt: createDate(new TimeSpan(2, "h")).getTime(),
      userId,
    });

    return tokenId;
  }

  async sendEmailVerificationCode(email: string, id: string) {
    await this.emailsService.sendEmail(
      email,
      "Confirme seu email",
      templates.EmailConfirmation({
        code: await this.generateEmailVerificationCode(id, email),
      }),
    );

    const session = await lucia.createSession(id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    return sessionCookie;
  }

  async resendEmail({ email }: { email: string }) {
    const user = await db.query.usersTable.findFirst({
      where: (user, { eq }) => eq(user.email, email),
    });

    if (!user) {
      throw new HTTPError(404, "User not found");
    }

    if (user.emailVerified) {
      throw new HTTPError(400, "Email already confirmed");
    }

    return await this.sendEmailVerificationCode(email, user.id);
  }

  async confirmEmail({ user, code }: { user: User | null; code: string }) {
    if (user === null) {
      throw new HTTPError(401, "Unauthorized");
    }

    const databaseCode = await db.query.emailVerificationCodeTable.findFirst({
      where: (emailVerificationCode, { eq }) =>
        eq(emailVerificationCode.userId, user.id),
    });

    if (
      !databaseCode ||
      databaseCode.code !== code ||
      databaseCode.email !== user.email
    ) {
      throw new HTTPError(400, "Invalid code");
    }

    await db
      .delete(emailVerificationCodeTable)
      .where(eq(emailVerificationCodeTable.userId, user.id));

    if (!isWithinExpirationDate(new Date(databaseCode.expiresAt))) {
      throw new HTTPError(400, "Code expired");
    }

    await db
      .update(usersTable)
      .set({ emailVerified: true })
      .where(eq(usersTable.id, user.id));

    await lucia.invalidateUserSessions(user.id);
  }

  async login({ email, password }: { email: string; password: string }) {
    const user = await db.query.usersTable.findFirst({
      where: (user, { eq }) => eq(user.email, email),
    });

    if (!user) {
      throw new HTTPError(401, "Invalid email or password");
    }

    if (!user.emailVerified) {
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

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    return { cookie: sessionCookie, user: _.omit(user, ["password"]) };
  }

  async sendPasswordResetToken({ email }: { email: string }) {
    const user = await db.query.usersTable.findFirst({
      where: (user, { eq }) => eq(user.email, email),
    });

    if (!user) {
      throw new HTTPError(404, "User not found");
    }

    const token = await this.createPasswordResetToken(email);

    const link = `${env.URL}/auth/reset-password/${token}`;

    await this.emailsService.sendEmail(
      email,
      "Redefinir senha",
      templates.ResetPassword({ link }),
    );
  }

  async resetPassword({
    token,
    password,
  }: { token: string; password: string }) {
    const tokenHash = encodeHex(await sha256(new TextEncoder().encode(token)));

    const passwordResetToken = await db.query.passwordResetTokenTable.findFirst(
      {
        where: (passwordResetToken, { eq }) =>
          eq(passwordResetToken.tokenHash, tokenHash),
      },
    );

    if (!passwordResetToken) {
      throw new HTTPError(400, "Invalid token");
    }

    if (!isWithinExpirationDate(new Date(passwordResetToken.expiresAt))) {
      throw new HTTPError(400, "Token expired");
    }

    await db
      .delete(passwordResetTokenTable)
      .where(eq(passwordResetTokenTable.tokenHash, tokenHash));

    await lucia.invalidateUserSessions(passwordResetToken.userId);

    await db
      .update(usersTable)
      .set({
        password: await Bun.password.hash(`${password}:${env.PASSWORD_PEPPER}`),
      })
      .where(eq(usersTable.id, passwordResetToken.userId));
  }
}
