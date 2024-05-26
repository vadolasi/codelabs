import { refreshTokens, users } from "./schema"
import { db } from "../../db"
import jwt from "jsonwebtoken"
import { HTTPError } from "../../error"
import EmailConfirmationEmail from "transactional/emails/EmailConfirmation"
import { Resend } from "resend"
import { eq } from "drizzle-orm"

const resend = new Resend(process.env.RESEND_API_KEY)

export abstract class UsersService {
  static async register({ email, username, password }: { email: string, username: string, password: string }) {
    const [{ id }] = await db
      .insert(users)
      .values({ email, username, password: await Bun.password.hash(password) })
      .returning({ id: users.id })
    
    const token = await new Promise<string>((resolve, reject) => {
      jwt.sign({ id, email }, process.env.JWT_SECRET!, (err: Error | null, token: string | undefined) => {
        if (err) {
          reject(err)
        } else {
          resolve(token!)
        }
      })
    })

    const link = `${process.env.URL}/auth/confirm-email/${id}?token=${token}`

    await resend.emails.send({
      from: "Codelabs <codelabs.vitordaniel.com>",
      to: email,
      subject: "Confirme seu email",
      react: EmailConfirmationEmail({ link })
    })

    return id
  }

  static async resendEmail({ email }: { email: string }) {
    const user = await db.query.users.findFirst({
      where: (user, { eq }) => eq(user.email, email)
    })

    if (!user) {
      throw new HTTPError(404, "User not found")
    }

    const token = await new Promise<string>((resolve, reject) => {
      jwt.sign({ id: user.id, email }, process.env.JWT_SECRET!, (err: Error | null, token: string | undefined) => {
        if (err) {
          reject(err)
        } else {
          resolve(token!)
        }
      })
    })

    const link = `${process.env.FRONTEND_URL}/auth/confirm-email/${user.id}?token=${token}`

    await resend.emails.send({
      from: "Codelabs <codelabs.vitordaniel.com>",
      to: email,
      subject: "Confirme seu email",
      react: EmailConfirmationEmail({ link })
    })
  }

  static async confirmEmail({ id, token }: { id: string, token: string }) {
    const { email } = jwt.verify(token, process.env.JWT_SECRET!) as { email: string }

    if (await db.query.users.findFirst({
      where: (user, { and, eq }) => and(eq(user.id, id), eq(user.email, email))
    }) === null) {
      throw new HTTPError(401, "Invalid token")
    }

    await db.update(users).set({ emailConfirmed: true }).where(eq(users.id, id))
  }

  static async checkEmail({ email }: { email: string }) {
    return await db.query.users.findFirst({
      where: (user, { eq }) => eq(user.email, email)
    }) !== null
  }

  static async checkUsername({ username }: { username: string }) {
    return await db.query.users.findFirst({
      where: (user, { eq }) => eq(user.username, username)
    }) !== null
  }

  static async login({ emailOrUsername, password }: { emailOrUsername: string, password: string }) {
    const user = await db.query.users.findFirst({
      where: (user, { eq, or }) => or(eq(user.email, emailOrUsername), eq(user.username, emailOrUsername))
    })

    if (!user) {
      throw new HTTPError(401, "Invalid email or password")
    }

    if (!user.emailConfirmed) {
      throw new HTTPError(401, "Email not confirmed")
    }

    if (await Bun.password.verify(password, user.password) === false) {
      throw new HTTPError(401, "Invalid email or password")
    }

    const token = await new Promise<string>((resolve, reject) => {
      jwt.sign({ id: user.id }, process.env.JWT_SECRET!, (err: Error | null, token: string | undefined) => {
        if (err) {
          reject(err)
        } else {
          resolve(token!)
        }
      })
    })

    const [{ id: refreshToken }] = await db
      .insert(refreshTokens)
      .values({ userId: user.id, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) })
      .returning({ id: refreshTokens.id })

    return { token, refreshToken }
  }

  static async refreshToken({ refreshToken: refreshTokenStr }: { refreshToken: string }) {
    const refreshTokenObj = await db.query.refreshTokens.findFirst({
      where: (refreshToken, { eq }) => eq(refreshToken.id, refreshTokenStr),
      with: { user: true }
    })

    if (!refreshTokenObj || refreshTokenObj.expiresAt.getTime() < Date.now()) {
      throw new HTTPError(401, "Invalid refresh token")
    }

    const userId = (refreshTokenObj.user as any).id as string

    const token = await new Promise<string>((resolve, reject) => {
      jwt.sign({ id: userId }, process.env.JWT_SECRET!, (err: Error | null, token: string | undefined) => {
        if (err) {
          reject(err)
        } else {
          resolve(token!)
        }
      })
    })

    return { token }
  }
}
