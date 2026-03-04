import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

const hasGoogleOAuth = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "client",
      },
    },
  },
  socialProviders: hasGoogleOAuth
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : undefined,
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;

export async function getServerSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function getRequestSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}
