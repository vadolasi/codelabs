import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

export const usersTable = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  email: text("email").unique().notNull(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  password: text("password").notNull(),
});

export const usersRelations = relations(usersTable, ({ many }) => ({
  sessions: many(sessionTable),
  emailVerificationCodes: many(emailVerificationCodeTable),
  passwordResetTokens: many(passwordResetTokenTable),
}));

export const sessionTable = sqliteTable("session", {
  id: text("id").notNull().primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const sessionRelations = relations(sessionTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sessionTable.userId],
    references: [usersTable.id],
  }),
}));

export const emailVerificationCodeTable = sqliteTable(
  "email_verification_code",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => nanoid()),
    code: text("code").notNull(),
    userId: text("user_id").notNull(),
    email: text("email").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
);

export const emailVerificationCodeRelations = relations(
  emailVerificationCodeTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [emailVerificationCodeTable.userId],
      references: [usersTable.id],
    }),
  }),
);

export const passwordResetTokenTable = sqliteTable("password_reset_token", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => nanoid()),
  tokenHash: text("token_hash").notNull().unique(),
  userId: text("user_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const passwordResetTokenRelations = relations(
  passwordResetTokenTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [passwordResetTokenTable.userId],
      references: [usersTable.id],
    }),
  }),
);
