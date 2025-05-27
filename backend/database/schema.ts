import type { FileSystemTree } from "@webcontainer/api"
import { relations } from "drizzle-orm"
import {
	boolean,
	customType,
	json,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid
} from "drizzle-orm/pg-core"

const bytea = customType<{
	data: Buffer
	default: false
}>({
	dataType() {
		return "bytea"
	}
})

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
	workspaces: many(workspaces),
	courses: many(coursesMembers)
}))

export const workspaces = pgTable("workspaces", {
	id: uuid("id").primaryKey().$defaultFn(Bun.randomUUIDv7),
	name: text("name").notNull(),
	content: bytea("content").notNull(),
	config: json("config")
		.$type<{ initialTerminals: { command: string }[]; exclude: string[] }>()
		.default({ initialTerminals: [], exclude: [] })
		.notNull(),
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
		.$onUpdateFn(() => new Date()),
	lessonId: uuid("lesson_id").references(() => lessons.id, {
		onDelete: "set null"
	})
})

export const workspacesRelations = relations(workspaces, ({ one }) => ({
	user: one(users, {
		fields: [workspaces.userId],
		references: [users.id]
	}),
	lesson: one(lessons, {
		fields: [workspaces.lessonId],
		references: [lessons.id]
	})
}))

export const databaseDriverEnum = pgEnum("database_driver", [
	"postgres",
	"sqlite"
])

export const databases = pgTable("databases", {
	id: uuid("id").primaryKey().$defaultFn(Bun.randomUUIDv7),
	name: text("name").notNull(),
	driver: databaseDriverEnum("driver").notNull(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	snapshot: bytea("snapshot").notNull(),
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

export const courses = pgTable("courses", {
	id: uuid("id").primaryKey().$defaultFn(Bun.randomUUIDv7),
	name: text("name").notNull(),
	description: text("description").notNull(),
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

export const coursesRelations = relations(courses, ({ many }) => ({
	members: many(coursesMembers),
	lessons: many(lessons),
	classes: many(classes)
}))

export const classes = pgTable("classes", {
	id: uuid("id").primaryKey().$defaultFn(Bun.randomUUIDv7),
	name: text("name").notNull(),
	description: text("description").notNull(),
	createdAt: timestamp("created_at", {
		mode: "date",
		precision: 0,
		withTimezone: true
	})
		.notNull()
		.defaultNow(),
	courseId: uuid("course_id")
		.notNull()
		.references(() => courses.id, { onDelete: "cascade" })
})

export const classesRelations = relations(classes, ({ one }) => ({
	course: one(courses, {
		fields: [classes.courseId],
		references: [courses.id]
	})
}))

export const courseMemberRoleEnum = pgEnum("course_member_role", [
	"admin",
	"member"
])

export const coursesMembers = pgTable("courses_members", {
	id: uuid("id").primaryKey().$defaultFn(Bun.randomUUIDv7),
	courseId: uuid("course_id")
		.notNull()
		.references(() => courses.id, { onDelete: "cascade" }),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	role: courseMemberRoleEnum("role").notNull(),
	classId: uuid("class_id").references(() => classes.id, {
		onDelete: "cascade"
	}),
	createdAt: timestamp("created_at", {
		mode: "date",
		precision: 0,
		withTimezone: true
	})
		.notNull()
		.defaultNow()
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

export const lessons = pgTable("lessons", {
	id: uuid("id").primaryKey().$defaultFn(Bun.randomUUIDv7),
	courseId: uuid("course_id")
		.notNull()
		.references(() => courses.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	createdAt: timestamp("created_at", {
		mode: "date",
		precision: 0,
		withTimezone: true
	})
		.notNull()
		.defaultNow()
})

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
	course: one(courses, {
		fields: [lessons.courseId],
		references: [courses.id]
	}),
	workspaces: many(workspaces)
}))
