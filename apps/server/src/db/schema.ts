import { relations, sql } from "drizzle-orm";
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
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`,
  ),
});

export const usersRelations = relations(usersTable, ({ many }) => ({
  sessions: many(sessionTable),
  emailVerificationCodes: many(emailVerificationCodeTable),
  passwordResetTokens: many(passwordResetTokenTable),
  workspaces: many(workspaceTable),
  courses: many(membersTable),
}));

export const sessionTable = sqliteTable("session", {
  id: text("id").notNull().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id),
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
      .primaryKey()
      .$defaultFn(() => nanoid()),
    code: text("code").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id),
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
    .primaryKey()
    .$defaultFn(() => nanoid()),
  tokenHash: text("token_hash").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id),
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

export const courseTable = sqliteTable("course", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`,
  ),
});

export const courseRelations = relations(courseTable, ({ many }) => ({
  workspaces: many(workspaceTable),
  members: many(membersTable),
  invites: many(inviteTable),
}));

export const workspaceTable = sqliteTable("workspace", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`,
  ),
  courseId: text("course_id").references(() => courseTable.id),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id),
});

export const workspaceRelations = relations(
  workspaceTable,
  ({ many, one }) => ({
    members: many(membersTable),
    course: one(courseTable, {
      fields: [workspaceTable.courseId],
      references: [courseTable.id],
    }),
    user: one(usersTable, {
      fields: [workspaceTable.userId],
      references: [usersTable.id],
    }),
    invites: many(inviteTable),
  }),
);

export const membersTable = sqliteTable("members", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  workspaceId: text("workspace_id").references(() => workspaceTable.id),
  courseId: text("course_id").references(() => courseTable.id),
  type: text("type", { enum: ["workspace", "course"] }).notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id),
  role: text("role", { enum: ["owner", "monitor", "member"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`,
  ),
});

export const membersRelations = relations(membersTable, ({ one }) => ({
  course: one(courseTable, {
    fields: [membersTable.courseId],
    references: [courseTable.id],
  }),
  workspace: one(workspaceTable, {
    fields: [membersTable.workspaceId],
    references: [workspaceTable.id],
  }),
  user: one(usersTable, {
    fields: [membersTable.userId],
    references: [usersTable.id],
  }),
}));

export const inviteTable = sqliteTable("invite", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  public: integer("public", { mode: "boolean" }).default(false),
  emails: text("emails", { mode: "json" })
    .$type<string[]>()
    .default(sql`(json_array())`),
  role: text("role", { enum: ["monitor", "member"] }).default("member"),
  workspaceId: text("workspace_id").references(() => workspaceTable.id),
  courseId: text("course_id").references(() => courseTable.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`,
  ),
});

export const inviteRelations = relations(inviteTable, ({ one }) => ({
  workspace: one(workspaceTable, {
    fields: [inviteTable.workspaceId],
    references: [workspaceTable.id],
  }),
  course: one(courseTable, {
    fields: [inviteTable.courseId],
    references: [courseTable.id],
  }),
}));
