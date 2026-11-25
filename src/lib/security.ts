import "server-only";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

function intEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), min), max);
}

/** Failed sign-ins allowed inside the window before the account/IP is throttled. */
export const LOGIN_MAX_FAILURES = intEnv("LOGIN_MAX_FAILURES", 5, 3, 20);
/** How far back sign-in failures are counted. */
export const LOGIN_WINDOW_MINUTES = intEnv("LOGIN_WINDOW_MINUTES", 15, 1, 1440);
const ATTEMPT_RETENTION_DAYS = 7;

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "123456789",
  "1234567890",
  "qwerty123",
  "letmein123",
  "admin@12345",
  "dean@12345",
  "instructor@12345",
  "student@12345",
  "parent@12345",
  "college@12345",
  "changeme123",
]);

export const strongPasswordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(200, "Password is too long.")
  .refine((value) => /[A-Za-z]/.test(value), "Include at least one letter.")
  .refine((value) => /\d/.test(value), "Include at least one number.")
  .refine(
    (value) => !COMMON_PASSWORDS.has(value.toLowerCase()),
    "That password is too common. Choose another one.",
  );

export function passwordProblem(value: string) {
  const parsed = strongPasswordSchema.safeParse(value);
  return parsed.success ? null : (parsed.error.issues[0]?.message ?? "Choose a stronger password.");
}

/** Random, policy-compliant password handed to an administrator once. */
export function generateTempPassword() {
  return `Tmp-${randomBytes(6).toString("hex")}1`;
}

export async function getRequestIp() {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    store.get("x-real-ip") ||
    store.get("cf-connecting-ip") ||
    undefined;
  return ip?.slice(0, 64);
}

function attemptCutoff() {
  return new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000);
}

/**
 * Returns true when this email (or source IP, at a higher threshold) has
 * exhausted its failed sign-in budget for the current window.
 */
export async function isLoginThrottled(email: string, ip?: string) {
  const since = attemptCutoff();

  const [emailFailures, ipFailures] = await Promise.all([
    prisma.loginAttempt.count({
      where: { email, successful: false, createdAt: { gte: since } },
    }),
    ip
      ? prisma.loginAttempt.count({
          where: { ip, successful: false, createdAt: { gte: since } },
        })
      : Promise.resolve(0),
  ]);

  return (
    emailFailures >= LOGIN_MAX_FAILURES ||
    ipFailures >= LOGIN_MAX_FAILURES * 4
  );
}

export async function recordLoginFailure(email: string, ip?: string) {
  await prisma.loginAttempt.create({ data: { email, ip, successful: false } });
}

export async function recordLoginSuccess(email: string, ip?: string) {
  await prisma.loginAttempt.create({ data: { email, ip, successful: true } });
  await prisma.loginAttempt.deleteMany({ where: { email, successful: false } });
}

/** Housekeeping: drop old attempt rows so the table stays small. */
export async function pruneLoginAttempts() {
  const cutoff = new Date(
    Date.now() - ATTEMPT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } });
}

export function loginThrottleMessage() {
  return `Too many sign-in attempts. Wait ${LOGIN_WINDOW_MINUTES} minutes and try again.`;
}
