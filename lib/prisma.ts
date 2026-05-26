import { PrismaClient } from "@prisma/client";

// 在开发模式下复用 Prisma 实例，避免每次热重载都创建新连接
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
