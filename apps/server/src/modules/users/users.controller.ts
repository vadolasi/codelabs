import Elysia, { t } from "elysia"
import { UsersService } from "./users.service"
import { HTTPError } from "../../error"

export const usersController = new Elysia()
  .decorate({ usersService: UsersService })
  .error({
    HTTPError
  })
  .onError(({ code, error, set }) => {
    switch (code) {
      case "HTTPError":
        set.status = error.code
        return error
    }
  })
  .group("/auth", group =>
    group
      .post(
        "/register",
        ({ usersService, body: { email, username, password } }) =>
          usersService.register({ email, username, password }),
        { body: t.Object({ email: t.String(), username: t.String(), password: t.String() }) }
      )
      .post(
        "/login",
        async ({ usersService, body: { emailOrUsername, password }, cookie: { token: tokenCookie, refreshToken: refreshTokenCookie } }) => {
          const { token, refreshToken } = await usersService.login({ emailOrUsername, password })

          tokenCookie.set({
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            expires: new Date(Date.now() + 1000 * 60 * 60)
          })
          refreshTokenCookie.set({
            value: refreshToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
          })

          return "Logged in successfully"
        },
        { body: t.Object({ emailOrUsername: t.String(), password: t.String() }) }
      )
      .post(
        "/refresh-token",
        async ({ usersService, cookie: { token: tokenCookie, refreshToken: refreshTokenCookie } }) => {
          const { token } = await usersService.refreshToken({ refreshToken: refreshTokenCookie.value })

          tokenCookie.set({
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            expires: new Date(Date.now() + 1000 * 60 * 60)
          })

          return "Token refreshed"
        },
      )
  )
  .group("/users", group =>
    group
      .group("/check", group =>
        group
          .get(
            "/email",
            ({ usersService, query: { email } }) => usersService.checkEmail({ email }),
            { query: t.Object({ email: t.String() }) }
          )
          .get(
            "/username",
            ({ usersService, query: { username } }) => usersService.checkUsername({ username }),
            { query: t.Object({ username: t.String() }) }
          )
      )
  )
