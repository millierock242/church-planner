import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

// Online (Railway): uses the Turso cloud database from environment variables.
// Locally with no Turso variables set: falls back to the local dev.db file.
const url = process.env.TURSO_DATABASE_URL || "file:./prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

const adapter = new PrismaLibSQL({ url, authToken });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma || new PrismaClient({ adapter } as never);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
