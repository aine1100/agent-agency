CREATE TYPE "public"."provider_type" AS ENUM('OPENAI', 'OLLAMA');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'client');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."step_status" AS ENUM('PENDING', 'RUNNING', 'PASSED', 'FAILED', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."verdict" AS ENUM('UNKNOWN', 'READY', 'NEEDS_WORK');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifact" (
	"id" text PRIMARY KEY NOT NULL,
	"runId" text NOT NULL,
	"path" text NOT NULL,
	"kind" text NOT NULL,
	"size" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"action" text NOT NULL,
	"entityType" text NOT NULL,
	"entityId" text,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run" (
	"id" text PRIMARY KEY NOT NULL,
	"workflowId" text NOT NULL,
	"objective" text NOT NULL,
	"provider" "provider_type" NOT NULL,
	"model" text NOT NULL,
	"includeMarketing" boolean DEFAULT true NOT NULL,
	"dryRun" boolean DEFAULT false NOT NULL,
	"status" "run_status" DEFAULT 'QUEUED' NOT NULL,
	"verdict" "verdict" DEFAULT 'UNKNOWN' NOT NULL,
	"errorMessage" text,
	"outputRoot" text,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"startedById" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_log" (
	"id" text PRIMARY KEY NOT NULL,
	"runId" text NOT NULL,
	"level" text DEFAULT 'info' NOT NULL,
	"message" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_step" (
	"id" text PRIMARY KEY NOT NULL,
	"runId" text NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"order" integer NOT NULL,
	"status" "step_status" DEFAULT 'PENDING' NOT NULL,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"details" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	"impersonatedBy" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean NOT NULL,
	"image" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"role" "role" DEFAULT 'client' NOT NULL,
	"banned" boolean,
	"banReason" text,
	"banExpires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "workflow" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"objectiveTemplate" text NOT NULL,
	"defaultDomainAgent" text NOT NULL,
	"defaultProvider" "provider_type" DEFAULT 'OPENAI' NOT NULL,
	"defaultModel" text DEFAULT 'gpt-4o-mini' NOT NULL,
	"includeMarketing" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"tags" text[],
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "workflow_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact" ADD CONSTRAINT "artifact_runId_run_id_fk" FOREIGN KEY ("runId") REFERENCES "public"."run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run" ADD CONSTRAINT "run_workflowId_workflow_id_fk" FOREIGN KEY ("workflowId") REFERENCES "public"."workflow"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run" ADD CONSTRAINT "run_startedById_user_id_fk" FOREIGN KEY ("startedById") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_log" ADD CONSTRAINT "run_log_runId_run_id_fk" FOREIGN KEY ("runId") REFERENCES "public"."run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_step" ADD CONSTRAINT "run_step_runId_run_id_fk" FOREIGN KEY ("runId") REFERENCES "public"."run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;