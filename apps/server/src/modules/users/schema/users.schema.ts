import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"
import { nanoid } from "nanoid"
import { refreshTokens } from "./refreshTokens.schema"

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  email: text("email").unique().notNull(),
  emailConfirmed: integer("emailConfirmed", { mode: "boolean" }).default(false),
  username: text("username").unique().notNull(),
  password: text("password").notNull()
})

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens)
}))
