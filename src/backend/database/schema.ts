import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
	id: serial(),
	email: text("email").notNull().unique(),
	emailNormalized: text("email_normalized").notNull().unique(),
	username: text("username").notNull().unique(),
	password: text("password").notNull(),
	createdAt: timestamp("created_at", { mode: "date" }).defaultNow()
})
