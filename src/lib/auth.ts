import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { compare, hash } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { isRole, ROLE_HOME, type Role } from "@/lib/constants";

export const SESSION_COOKIE = "iscp_session";
const TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? 14);
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;
/** Maximum concurrent sessions kept per account (oldest are dropped). */
const MAX_SESSIONS_PER_USER = 5;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(plain: string) {
  return hash(plain, 12);
}

export async function verifyPassword(plain: string, passwordHash: string) {
  return compare(plain, passwordHash);
}

export async function createSession(
  userId: string,
  meta?: { userAgent?: string; ip?: string },
) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TTL_MS);

  // Keep the session table tidy and cap concurrent devices per account.
  await prisma.session.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });
  const stale = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: MAX_SESSIONS_PER_USER - 1,
    select: { id: true },
  });
  if (stale.length > 0) {
    await prisma.session.deleteMany({
      where: { id: { in: stale.map((session) => session.id) } },
    });
  }

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: meta?.userAgent?.slice(0, 250),
      ip: meta?.ip?.slice(0, 64),
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  store.delete(SESSION_COOKIE);
}

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarMediaId: string | null;
  role: Role;
  mustChangePassword: boolean;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) return null;
  if (!session.user.isActive) return null;
  if (!isRole(session.user.role)) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    phone: session.user.phone,
    avatarMediaId: session.user.avatarMediaId,
    role: session.user.role,
    mustChangePassword: session.user.mustChangePassword,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  // Temporary passwords must be replaced before any role workspace opens.
  if (user.mustChangePassword) redirect("/account/password");
  if (!roles.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return user;
}
