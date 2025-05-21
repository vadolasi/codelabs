import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
	id: uuid("id").primaryKey().$defaultFn(Bun.randomUUIDv7),
	email: text("email").notNull().unique(),
	username: text("username").notNull().unique(),
	password: text("password").notNull(),
	createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
	emailVerified: boolean("email_verified").notNull().default(false),
	emailOTP: text("email_otp"),
	emailOTPExpiresAt: timestamp("email_otp_expires_at", { mode: "date" })
})
