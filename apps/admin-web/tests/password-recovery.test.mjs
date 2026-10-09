import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { forgotPasswordSchema, resetPasswordSchema } from "@attendance/validation";
import { isRecoveryCallback, recoveryRedirectUrl } from "../lib/auth/recovery.ts";

test("recovery email and password validation use the shared requirements", () => {
  assert.equal(forgotPasswordSchema.safeParse({ email: "student@example.edu" }).success, true);
  assert.equal(forgotPasswordSchema.safeParse({ email: "not-an-email" }).success, false);
  assert.equal(resetPasswordSchema.safeParse({ password: "new-pass-123", confirmPassword: "new-pass-123" }).success, true);
  assert.equal(resetPasswordSchema.safeParse({ password: "new-pass-123", confirmPassword: "different" }).success, false);
  assert.equal(resetPasswordSchema.safeParse({ password: "short", confirmPassword: "short" }).success, false);
});

test("recovery redirect is fixed to the same application origin", () => {
  assert.equal(recoveryRedirectUrl("https://staging.example.edu"), "https://staging.example.edu/auth/callback?type=recovery");
  assert.equal(isRecoveryCallback("recovery", "12345678"), true);
  assert.equal(isRecoveryCallback("signup", "12345678"), false);
  assert.equal(isRecoveryCallback("recovery", null), false);
});

test("forgot-password response remains account-neutral", async () => {
  const source = await readFile(new URL("../app/forgot-password/forgot-password-form.tsx", import.meta.url), "utf8");
  assert.match(source, /If an account exists/);
  assert.doesNotMatch(source, /user.*not found|email.*does not exist/i);
});

test("reset route requires a verified recovery marker and callback exchanges the code", async () => {
  const [page, callback, marker] = await Promise.all([
    readFile(new URL("../app/reset-password/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/callback/auth-callback.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/recovery/mark/route.ts", import.meta.url), "utf8")
  ]);
  assert.match(page, /recoveryUserId === data\.user\.id/);
  assert.match(callback, /exchangeCodeForSession/);
  assert.match(callback, /setSession/);
  assert.match(callback, /history\.replaceState/);
  assert.match(marker, /httpOnly: true/);
  assert.match(marker, /data\.user\.id !== body\.userId/);
  assert.match(marker, /entry\.method === "otp"/);
  assert.doesNotMatch(callback, /searchParams\.get\(["']next/);
});
