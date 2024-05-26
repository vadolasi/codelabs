import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"
import { nanoid } from "nanoid"
import { users } from "./users.schema"

export const refreshTokens = sqliteTable("refreshTokens", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("userId").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull()
})

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  author: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}))
