import { relations } from "drizzle-orm";
import {
  boolean,
  char,
  date,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

export const usersTable = pgTable("users", {
  id: char("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  email: varchar("email", { length: 64 }).unique().notNull(),
  emailVerified: boolean("email_verified").default(false),
  firstName: varchar("first_name", { length: 32 }).notNull(),
  lastName: varchar("last_name", { length: 32 }).notNull(),
  password: varchar("password", { length: 128 }).notNull(),
  createdAt: date("created_at", { mode: "date" }).defaultNow(),
  picture: varchar("picture", { length: 256 }).notNull(),
});

export const usersRelations = relations(usersTable, ({ many }) => ({
  sessions: many(sessionTable),
  emailVerificationCodes: many(emailVerificationCodeTable),
  passwordResetTokens: many(passwordResetTokenTable),
  courses: many(courseMemberTable),
  notifications: many(notificationsTable),
}));

export const notificationsTable = pgTable("notifications", {
  id: char("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: char("user_id", { length: 21 })
    .notNull()
    .references(() => usersTable.id),
  message: varchar("message", { length: 256 }).notNull(),
  read: boolean("read").default(false),
  createdAt: date("created_at", { mode: "date" }).defaultNow(),
});

export const notificationsRelations = relations(
  notificationsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [notificationsTable.userId],
      references: [usersTable.id],
    }),
  }),
);

export const sessionTable = pgTable("session", {
  id: varchar("id").notNull().primaryKey(),
  userId: char("user_id", { length: 21 })
    .notNull()
    .references(() => usersTable.id),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
});

export const sessionRelations = relations(sessionTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sessionTable.userId],
    references: [usersTable.id],
  }),
}));

export const emailVerificationCodeTable = pgTable("email_verification_code", {
  id: char("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  code: char("code", { length: 8 }).notNull(),
  userId: char("user_id", { length: 21 })
    .notNull()
    .references(() => usersTable.id),
  email: varchar("email", { length: 64 }).notNull(),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
});

export const emailVerificationCodeRelations = relations(
  emailVerificationCodeTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [emailVerificationCodeTable.userId],
      references: [usersTable.id],
    }),
  }),
);

export const passwordResetTokenTable = pgTable("password_reset_token", {
  id: char("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  tokenHash: varchar("token_hash").notNull().unique(),
  userId: char("user_id", { length: 21 })
    .notNull()
    .references(() => usersTable.id),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
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

export const courseTable = pgTable("course", {
  id: char("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: varchar("name", { length: 64 }).notNull(),
  createdAt: date("created_at", { mode: "date" }).defaultNow(),
});

export const courseRelations = relations(courseTable, ({ many }) => ({
  conferences: many(conferenceTable),
  members: many(courseMemberTable),
  invites: many(inviteTable),
}));

export const conferenceTable = pgTable("conference", {
  id: char("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: varchar("name", { length: 64 }).notNull(),
  createdAt: date("created_at", { mode: "date" }).defaultNow(),
  courseId: char("course_id", { length: 21 })
    .notNull()
    .references(() => courseTable.id),
});

export const conferenceRelations = relations(conferenceTable, ({ one }) => ({
  course: one(courseTable, {
    fields: [conferenceTable.courseId],
    references: [courseTable.id],
  }),
}));

export const workspaceTable = pgTable("workspace", {
  id: char("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  conferenceId: char("conference_id", { length: 21 })
    .notNull()
    .references(() => conferenceTable.id),
  name: varchar("name", { length: 64 }).notNull(),
  createdAt: date("created_at", { mode: "date" }).defaultNow(),
});

export const workspaceRelations = relations(
  workspaceTable,
  ({ one, many }) => ({
    conference: one(conferenceTable, {
      fields: [workspaceTable.conferenceId],
      references: [conferenceTable.id],
    }),
    members: many(courseMemberTable),
    data: many(workspaceDataTable),
  }),
);

export const dataTypeEnum = pgEnum("data_type", ["loro", "other"]);

export const workspaceDataTable = pgTable("workspace_data", {
  id: char("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  workspaceId: char("workspace_id", { length: 21 }).references(
    () => workspaceTable.id,
  ),
  type: dataTypeEnum(),
  data: text("data").notNull(),
  createdAt: date("created_at", { mode: "date" }).defaultNow(),
});

export const workspaceDataRelations = relations(
  workspaceDataTable,
  ({ one }) => ({
    workspace: one(workspaceTable, {
      fields: [workspaceDataTable.workspaceId],
      references: [workspaceTable.id],
    }),
  }),
);

export const roleEnum = pgEnum("role", ["owner", "monitor", "member"]);

export const courseMemberTable = pgTable("member", {
  id: char("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  courseId: char("course_id", { length: 21 })
    .notNull()
    .references(() => courseTable.id),
  userId: char("user_id", { length: 21 })
    .notNull()
    .references(() => usersTable.id),
  role: roleEnum(),
  createdAt: date("created_at", { mode: "date" }).defaultNow(),
});

export const courseMemberRelations = relations(
  courseMemberTable,
  ({ one }) => ({
    course: one(courseTable, {
      fields: [courseMemberTable.courseId],
      references: [courseTable.id],
    }),
    user: one(usersTable, {
      fields: [courseMemberTable.userId],
      references: [usersTable.id],
    }),
  }),
);

export const inviteTable = pgTable("invite", {
  id: char("id", { length: 21 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  public: boolean("public").default(false),
  emails: json("emails").$type<string[]>().default([]),
  role: roleEnum().default("member"),
  courseId: char("course_id", { length: 21 })
    .notNull()
    .references(() => courseTable.id),
  createdAt: date("created_at", { mode: "date" }).defaultNow(),
});

export const inviteRelations = relations(inviteTable, ({ one }) => ({
  course: one(courseTable, {
    fields: [inviteTable.courseId],
    references: [courseTable.id],
  }),
}));
