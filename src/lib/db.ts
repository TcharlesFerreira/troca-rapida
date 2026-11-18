import { PrismaClient } from "@prisma/client";

// Uma única conexão em desenvolvimento (o hot reload do Next recriaria a cada salvamento).
const global = globalThis as unknown as { prisma?: PrismaClient };

export const db = global.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = db;
