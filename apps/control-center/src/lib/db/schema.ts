import { pgTable, text, timestamp, boolean, integer, jsonb, pgEnum, primaryKey, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["admin", "client"]);
export const providerTypeEnum = pgEnum("provider_type", ["OPENAI", "OLLAMA"]);
export const runStatusEnum = pgEnum("run_status", ["QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELED"]);
export const stepStatusEnum = pgEnum("step_status", ["PENDING", "RUNNING", "PASSED", "FAILED", "SKIPPED"]);
export const verdictEnum = pgEnum("verdict", ["UNKNOWN", "READY", "NEEDS_WORK"]);

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("emailVerified").notNull(),
	image: text("image"),
	createdAt: timestamp("createdAt").notNull(),
	updatedAt: timestamp("updatedAt").notNull(),
	role: roleEnum("role").default("client").notNull(),
	banned: boolean("banned"),
	banReason: text("banReason"),
	banExpires: timestamp("banExpires"),
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expiresAt").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("createdAt").notNull(),
	updatedAt: timestamp("updatedAt").notNull(),
	ipAddress: text("ipAddress"),
	userAgent: text("userAgent"),
	userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
	impersonatedBy: text("impersonatedBy"),
}, (table) => [{
	userIdIdx: index("session_userId_idx").on(table.userId),
}]);

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("accountId").notNull(),
	providerId: text("providerId").notNull(),
	userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("accessToken"),
	refreshToken: text("refreshToken"),
	idToken: text("idToken"),
	accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
	refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("createdAt").notNull(),
	updatedAt: timestamp("updatedAt").notNull(),
}, (table) => [{
	userIdIdx: index("account_userId_idx").on(table.userId),
}]);

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expiresAt").notNull(),
	createdAt: timestamp("createdAt"),
	updatedAt: timestamp("updatedAt"),
});

export const workflow = pgTable("workflow", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	description: text("description").notNull(),
	objectiveTemplate: text("objectiveTemplate").notNull(),
	defaultDomainAgent: text("defaultDomainAgent").notNull(),
	defaultProvider: providerTypeEnum("defaultProvider").default("OPENAI").notNull(),
	defaultModel: text("defaultModel").default("gpt-4o-mini").notNull(),
	includeMarketing: boolean("includeMarketing").default(true).notNull(),
	active: boolean("active").default(true).notNull(),
	tags: text("tags").array(),
	nodes: jsonb("nodes"),
	edges: jsonb("edges"),
	createdAt: timestamp("createdAt").defaultNow().notNull(),
	updatedAt: timestamp("updatedAt").notNull(),
});

export const run = pgTable("run", {
	id: text("id").primaryKey(),
	workflowId: text("workflowId").notNull().references(() => workflow.id),
	objective: text("objective").notNull(),
	provider: providerTypeEnum("provider").notNull(),
	model: text("model").notNull(),
	includeMarketing: boolean("includeMarketing").default(true).notNull(),
	dryRun: boolean("dryRun").default(false).notNull(),
	status: runStatusEnum("status").default("QUEUED").notNull(),
	verdict: verdictEnum("verdict").default("UNKNOWN").notNull(),
	errorMessage: text("errorMessage"),
	outputRoot: text("outputRoot"),
	startedAt: timestamp("startedAt"),
	completedAt: timestamp("completedAt"),
	createdAt: timestamp("createdAt").defaultNow().notNull(),
	updatedAt: timestamp("updatedAt").notNull(),
	startedById: text("startedById").notNull().references(() => user.id),
}, (table) => [{
	createdAtIdx: index("run_createdAt_idx").on(table.createdAt),
	statusIdx: index("run_status_idx").on(table.status),
	startedByIdIdx: index("run_startedById_idx").on(table.startedById),
}]);

export const runStep = pgTable("run_step", {
	id: text("id").primaryKey(),
	runId: text("runId").notNull().references(() => run.id, { onDelete: "cascade" }),
	key: text("key").notNull(),
	title: text("title").notNull(),
	order: integer("order").notNull(),
	status: stepStatusEnum("status").default("PENDING").notNull(),
	startedAt: timestamp("startedAt"),
	completedAt: timestamp("completedAt"),
	details: text("details"),
}, (table) => [{
	runIdKeyUnique: uniqueIndex("run_step_runId_key_unique").on(table.runId, table.key),
	runIdOrderIdx: index("run_step_runId_order_idx").on(table.runId, table.order),
}]);

export const runLog = pgTable("run_log", {
	id: text("id").primaryKey(),
	runId: text("runId").notNull().references(() => run.id, { onDelete: "cascade" }),
	stepKey: text("stepKey"),
	level: text("level").default("info").notNull(),
	message: text("message").notNull(),
	createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [{
	runIdCreatedAtIdx: index("run_log_runId_createdAt_idx").on(table.runId, table.createdAt),
	runIdStepKeyIdx: index("run_log_runId_stepKey_idx").on(table.runId, table.stepKey),
}]);

export const artifact = pgTable("artifact", {
	id: text("id").primaryKey(),
	runId: text("runId").notNull().references(() => run.id, { onDelete: "cascade" }),
	stepKey: text("stepKey"),
	path: text("path").notNull(),
	kind: text("kind").notNull(),
	size: integer("size"),
	createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [{
	runIdIdx: index("artifact_runId_idx").on(table.runId),
}]);

export const auditLog = pgTable("audit_log", {
	id: text("id").primaryKey(),
	userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
	action: text("action").notNull(),
	entityType: text("entityType").notNull(),
	entityId: text("entityId"),
	metadata: jsonb("metadata"),
	createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [{
	userIdCreatedAtIdx: index("audit_log_userId_createdAt_idx").on(table.userId, table.createdAt),
}]);

export const conversation = pgTable("conversation", {
	id: text("id").primaryKey(),
	userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	workflowId: text("workflowId").references(() => workflow.id),
	createdAt: timestamp("createdAt").defaultNow().notNull(),
	updatedAt: timestamp("updatedAt").notNull(),
}, (table) => [{
	userIdIdx: index("conversation_userId_idx").on(table.userId),
}]);

export const chatMessage = pgTable("chat_message", {
	id: text("id").primaryKey(),
	conversationId: text("conversationId").notNull().references(() => conversation.id, { onDelete: "cascade" }),
	role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
	content: text("content").notNull(),
	metadata: jsonb("metadata"),
	createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [{
	conversationIdIdx: index("chat_message_conversationId_idx").on(table.conversationId),
}]);

// Relations
export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	runs: many(run),
	auditLogs: many(auditLog),
	conversations: many(conversation),
}));

export const conversationRelations = relations(conversation, ({ one, many }) => ({
	user: one(user, {
		fields: [conversation.userId],
		references: [user.id],
	}),
	messages: many(chatMessage),
}));

export const chatMessageRelations = relations(chatMessage, ({ one }) => ({
	conversation: one(conversation, {
		fields: [chatMessage.conversationId],
		references: [conversation.id],
	}),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

export const workflowRelations = relations(workflow, ({ many }) => ({
	runs: many(run),
}));

export const runRelations = relations(run, ({ one, many }) => ({
	workflow: one(workflow, {
		fields: [run.workflowId],
		references: [workflow.id],
	}),
	startedBy: one(user, {
		fields: [run.startedById],
		references: [user.id],
	}),
	steps: many(runStep),
	logs: many(runLog),
	artifacts: many(artifact),
}));

export const runStepRelations = relations(runStep, ({ one }) => ({
	run: one(run, {
		fields: [runStep.runId],
		references: [run.id],
	}),
}));

export const runLogRelations = relations(runLog, ({ one }) => ({
	run: one(run, {
		fields: [runLog.runId],
		references: [run.id],
	}),
}));

export const artifactRelations = relations(artifact, ({ one }) => ({
	run: one(run, {
		fields: [artifact.runId],
		references: [run.id],
	}),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
	user: one(user, {
		fields: [auditLog.userId],
		references: [user.id],
	}),
}));
