import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

// Reuse the client across hot reloads in dev to avoid exhausting connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// One code path for local dev and Vercel: the libSQL adapter talks to Turso
// when TURSO_* env vars are set, and to a local `file:` SQLite DB otherwise.
// (Serverless-safe: no local disk writes when pointed at Turso.)
// NB: libSQL resolves `file:` relative to CWD (project root), whereas the Prisma
// CLI resolves DATABASE_URL relative to prisma/. So locally we point at the
// migrated file explicitly (prisma/dev.db) rather than reusing DATABASE_URL.
const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:./prisma/dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const adapter = new PrismaLibSQL(libsql);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Verdict is scoped to a single group for now (see README assumptions).
 * The whole schema is group-scoped, so multi-group is an additive change,
 * not a rewrite. This returns the default group, creating it if missing.
 */
export async function getDefaultGroup() {
  const existing = await prisma.group.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.group.create({ data: { name: "The Circle" } });
}
