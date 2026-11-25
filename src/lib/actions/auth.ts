"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import {
  createSession,
  destroySession,
  hashPassword,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { isRole, ROLE_HOME } from "@/lib/constants";
import type { ActionState } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import {
  getRequestIp,
  isLoginThrottled,
  loginThrottleMessage,
  passwordProblem,
  pruneLoginAttempts,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/lib/security";
import { safeNextPath } from "@/lib/utils";

export type LoginState = { error?: string } | undefined;

const loginSchema = z.object({
  email: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(200),
  next: z.string().optional(),
});

/**
 * A fixed bcrypt hash used when the email is unknown, so a request costs the
 * same whether or not the account exists (prevents timing-based enumeration).
 */
const DUMMY_PASSWORD_HASH =
  "$2b$12$mXP/V1HcydWqBJduw28Ztu.2I.FBUYwSjJYwIkEiAeiGGkRVljCDG";

async function requestMeta() {
  const requestHeaders = await headers();
  return {
    ip: await getRequestIp(),
    userAgent: requestHeaders.get("user-agent") ?? undefined,
  };
}

export async function loginAction(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return { error: "Enter your email and password." };
  }

  const email = parsed.data.email.toLowerCase();
  const meta = await requestMeta();

  if (await isLoginThrottled(email, meta.ip)) {
    return { error: loginThrottleMessage() };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await verifyPassword(
    parsed.data.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !valid || !user.isActive) {
    await recordLoginFailure(email, meta.ip);
    return { error: "Invalid email or password." };
  }

  if (
    process.env.PUBLIC_DEMO_MODE === "true" &&
    ["ADMIN", "PRINCIPAL", "TEACHER", "CASHIER"].includes(user.role)
  ) {
    await recordLoginFailure(email, meta.ip);
    return { error: "This public demo is for students and parents only." };
  }

  await recordLoginSuccess(email, meta.ip);
  await pruneLoginAttempts().catch(() => undefined);

  await createSession(user.id, {
    userAgent: meta.userAgent,
    ip: meta.ip,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await audit(user.id, "Signed in", "User", user.id);

  if (user.mustChangePassword) redirect("/account/password");

  const role = isRole(user.role) ? user.role : "STUDENT";
  redirect(safeNextPath(parsed.data.next) ?? ROLE_HOME[role]);
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(1).max(200),
  confirmPassword: z.string().min(1).max(200),
});

export async function changePasswordAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) return { error: "Fill in all three password fields." };

  if (parsed.data.newPassword !== parsed.data.confirmPassword) {
    return { error: "The new passwords do not match." };
  }

  const problem = passwordProblem(parsed.data.newPassword);
  if (problem) return { error: problem };

  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record) return { error: "Account not found." };

  const valid = await verifyPassword(
    parsed.data.currentPassword,
    record.passwordHash,
  );
  if (!valid) return { error: "Your current password is incorrect." };

  if (await verifyPassword(parsed.data.newPassword, record.passwordHash)) {
    return { error: "Choose a password different from your current one." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      mustChangePassword: false,
    },
  });

  // Invalidate every existing session, then keep this device signed in.
  await prisma.session.deleteMany({ where: { userId: user.id } });
  const meta = await requestMeta();
  await createSession(user.id, { userAgent: meta.userAgent, ip: meta.ip });

  await audit(user.id, "Changed password", "User", user.id);
  redirect(ROLE_HOME[user.role]);
}
