import { verifyEmail } from "@devmehq/email-validator-js"
import { zxcvbnAsync, zxcvbnOptions } from "@zxcvbn-ts/core"
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common"
import { matcherPwnedFactory } from "@zxcvbn-ts/matcher-pwned"
import Elysia, { t } from "elysia"
import { normalizeEmail } from "email-normalizer"
import db from "../../database"
import { users } from "../../database/schema"

const matcherPwned = matcherPwnedFactory(fetch, zxcvbnOptions)
zxcvbnOptions.addMatcher("pwned", matcherPwned)

zxcvbnOptions.setOptions({
	graphs: zxcvbnCommonPackage.adjacencyGraphs,
	dictionary: zxcvbnCommonPackage.dictionary,
	useLevenshteinDistance: true
})

const usersController = new Elysia({
	name: "api.users",
	prefix: "/users"
}).post(
	"/register",
	async ({ body: { email, username, password }, status }) => {
		const emailNormalized = normalizeEmail({ email })

		const existingUser = await db.query.users.findFirst({
			where: (users, { or, eq }) =>
				or(
					eq(users.emailNormalized, emailNormalized),
					eq(users.username, username)
				),
			columns: { id: true }
		})

		if (existingUser) {
			return {}
		}

		if ((await zxcvbnAsync(password)).score < 3) {
			return status(400, { message: "WEAK_PASSWORD" })
		}

		if (
			Object.values(
				await verifyEmail({
					emailAddress: email,
					verifyMx: true,
					verifySmtp: true
				})
			).some((result) => result === false || result === null)
		) {
			return status(400, { message: "INVALID_EMAIL" })
		}

		await db.insert(users).values({
			email: email.toLowerCase(),
			emailNormalized,
			username,
			password: await Bun.password.hash(password)
		})

		return {}
	},
	{
		body: t.Object({
			email: t.String({ maxLength: 255, minLength: 5 }),
			username: t.String({ maxLength: 255, minLength: 3 }),
			password: t.String({ minLength: 8 })
		})
	}
)

export default usersController
