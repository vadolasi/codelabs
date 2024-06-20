import { db } from "../../db";
import { usersTable } from "../../db/schema";
import env from "../../env";
import AuthService from "../auth/auth.service";

export default class UsersService {
  authService = new AuthService();

  async checkEmail({ email }: { email: string }) {
    const user = await db.query.usersTable.findFirst({
      where: (user, { eq }) => eq(user.email, email),
    });

    return !!user;
  }

  async register({
    email,
    firstName,
    lastName,
    password,
  }: { email: string; firstName: string; lastName: string; password: string }) {
    const [{ id }] = await db
      .insert(usersTable)
      .values({
        email,
        firstName,
        lastName,
        password: await Bun.password.hash(`${password}:${env.PASSWORD_PEPPER}`),
      })
      .returning({ id: usersTable.id });

    return this.authService.sendEmailVerificationCode(email, id);
  }
}
