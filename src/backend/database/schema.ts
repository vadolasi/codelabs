import { relations } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { blob } from "drizzle-orm/sqlite-core/columns/blob"

export const workspaceSnapshots = sqliteTable("workspace_snapshots", {
  id: text("id").primaryKey().notNull(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  snapshot: blob("snapshot", { mode: "buffer" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
})

export const workspaceSnapshotsRelations = relations(
  workspaceSnapshots,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceSnapshots.workspaceId],
      references: [workspaces.id]
    })
  })
)

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  emailOTP: text("email_otp"),
  emailOTPExpiresAt: integer("email_otp_expires_at", { mode: "timestamp" }),
  role: text("role", { enum: ["user", "admin"] })
    .notNull()
    .default("user")
})

export const usersRelations = relations(users, ({ many }) => ({
  workspaces: many(workspaces__users),
  courses: many(coursesMembers)
}))

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull()
})

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  config: text("config", { mode: "json" })
    .$type<{ initialTerminals: { command: string }[]; exclude: string[] }>()
    .default({ initialTerminals: [], exclude: [] })
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
  conferenceId: text("lesson_id").references(() => conferences.id, {
    onDelete: "set null"
  })
})

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  users: many(workspaces__users),
  lesson: one(conferences, {
    fields: [workspaces.conferenceId],
    references: [conferences.id]
  }),
  databases: many(database__workspaces),
  invites: many(workspaceInvite)
}))

export const workspaces__users = sqliteTable("workspace_users", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  role: text("role", { enum: ["owner", "admin", "editor", "viewer"] }).notNull()
})

export const workspaces__usersRelations = relations(
  workspaces__users,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaces__users.workspaceId],
      references: [workspaces.id]
    }),
    user: one(users, {
      fields: [workspaces__users.userId],
      references: [users.id]
    })
  })
)

export const workspaceInvite = sqliteTable("workspace_invites", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  role: text("role", {
    enum: ["owner", "admin", "editor", "viewer"]
  }).notNull(),
  users: text("emails", { mode: "json" }).$type<string[]>(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  expiresAt: integer("expires_at", { mode: "timestamp" })
})

export const workspaceInviteRelations = relations(
  workspaceInvite,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceInvite.workspaceId],
      references: [workspaces.id]
    })
  })
)

export const databases = sqliteTable("databases", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  driver: text("driver", { enum: ["postgres", "sqlite"] }).notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date())
})

export const databasesRelations = relations(databases, ({ one, many }) => ({
  user: one(users, {
    fields: [databases.userId],
    references: [users.id]
  }),
  workspaces: many(database__workspaces)
}))

export const database__workspaces = sqliteTable("database_workspaces", {
  id: text("id").primaryKey(),
  databaseId: text("database_id")
    .notNull()
    .references(() => databases.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
})

export const database__workspacesRelations = relations(
  database__workspaces,
  ({ one }) => ({
    database: one(databases, {
      fields: [database__workspaces.databaseId],
      references: [databases.id]
    }),
    workspace: one(workspaces, {
      fields: [database__workspaces.workspaceId],
      references: [workspaces.id]
    })
  })
)

export const courses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date())
})

export const coursesRelations = relations(courses, ({ many }) => ({
  members: many(coursesMembers),
  lessons: many(conferences),
  classes: many(classes)
}))

export const classes = sqliteTable("classes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" })
})

export const classesRelations = relations(classes, ({ one }) => ({
  course: one(courses, {
    fields: [classes.courseId],
    references: [courses.id]
  })
}))

export const coursesMembers = sqliteTable("courses_members", {
  id: text("id").primaryKey(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["admin", "member"] }).notNull(),
  classId: text("class_id").references(() => classes.id, {
    onDelete: "cascade"
  }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
})

export const coursesMembersRelations = relations(coursesMembers, ({ one }) => ({
  course: one(courses, {
    fields: [coursesMembers.courseId],
    references: [courses.id]
  }),
  user: one(users, {
    fields: [coursesMembers.userId],
    references: [users.id]
  })
}))

export const conferences = sqliteTable("conferences", {
  id: text("id").primaryKey(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
})

export const conferencesRelations = relations(conferences, ({ one, many }) => ({
  course: one(courses, {
    fields: [conferences.courseId],
    references: [courses.id]
  }),
  workspaces: many(workspaces)
}))

export const workspaceUpdates = sqliteTable("workspace_updates", {
  id: text("id").primaryKey().notNull(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  update: blob("update", { mode: "buffer" }).notNull(), // binário puro
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
})

export const workspaceUpdatesRelations = relations(
  workspaceUpdates,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceUpdates.workspaceId],
      references: [workspaces.id]
    })
  })
)
