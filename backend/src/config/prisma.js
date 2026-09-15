import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

const withPrismaConnectionDefaults = (databaseUrl) => {
  const url = new URL(databaseUrl);

  if (!url.searchParams.has("connection_limit")) {
    url.searchParams.set("connection_limit", String(env.PRISMA_CONNECTION_LIMIT));
  }

  if (
    url.hostname.endsWith(".pooler.supabase.com") &&
    url.port === "6543" &&
    !url.searchParams.has("pgbouncer")
  ) {
    url.searchParams.set("pgbouncer", "true");
  }

  return url.toString();
};

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: withPrismaConnectionDefaults(env.DATABASE_URL)
    }
  }
});
