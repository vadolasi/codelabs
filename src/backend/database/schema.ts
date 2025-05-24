import type { FileSystemTree } from "@webcontainer/api"
import { relations, sql } from "drizzle-orm"
import {
	boolean,
	json,
	pgTable,
	text,
	timestamp,
	uuid
} from "drizzle-orm/pg-core"

export const users = pgTable("users", {
	id: uuid("id").primaryKey().$defaultFn(Bun.randomUUIDv7),
	email: text("email").notNull().unique(),
	username: text("username").notNull().unique(),
	password: text("password").notNull(),
	createdAt: timestamp("created_at", {
		mode: "date",
		precision: 0,
		withTimezone: true
	})
		.notNull()
		.defaultNow(),
	emailVerified: boolean("email_verified").notNull().default(false),
	emailOTP: text("email_otp"),
	emailOTPExpiresAt: timestamp("email_otp_expires_at", {
		mode: "date",
		precision: 0,
		withTimezone: true
	})
})

export const usersRelations = relations(users, ({ many }) => ({
	workspaces: many(workspaces)
}))

export const workspaces = pgTable("workspaces", {
	id: uuid("id").primaryKey().$defaultFn(Bun.randomUUIDv7),
	name: text("name").notNull(),
	content: json("content").$type<FileSystemTree>().default({}).notNull(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id),
	createdAt: timestamp("created_at", {
		mode: "date",
		precision: 0,
		withTimezone: true
	})
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", {
		mode: "date",
		precision: 0,
		withTimezone: true
	})
		.notNull()
		.defaultNow()
		.$onUpdateFn(() => new Date())
})

export const workspacesRelations = relations(workspaces, ({ one }) => ({
	user: one(users, {
		fields: [workspaces.userId],
		references: [users.id]
	})
}))
