import assert from "node:assert/strict";
import { test } from "node:test";
import { authFeedback, parseAuthCallback } from "../src/services/authFeedback.ts";

test("recovery links work for a standalone app and Expo Go", () => {
  for (const base of ["attendance://auth-callback", "exp://192.0.2.1:8081/--/auth-callback"]) {
    assert.deepEqual(parseAuthCallback(`${base}#access_token=test-access&refresh_token=test-refresh&type=recovery`), {
      type: "recovery", accessToken: "test-access", refreshToken: "test-refresh"
    });
  }
});

test("signup confirmation is distinct from password recovery", () => {
  assert.equal(parseAuthCallback("attendance://auth-callback#type=signup&access_token=a&refresh_token=r").type, "signup");
});

test("query parameters and encoded token values are decoded", () => {
  const result = parseAuthCallback("https://campus.example/auth-callback?type=recovery&access_token=a%2Bb&refresh_token=r%3D");
  assert.equal(result.accessToken, "a+b");
  assert.equal(result.refreshToken, "r=");
});

test("missing credentials, unsupported link types and expired links are rejected", () => {
  for (const suffix of ["", "#type=recovery&access_token=a", "#type=magiclink&access_token=a&refresh_token=r", "#type=recovery&access_token=&refresh_token=r", "#error_code=otp_expired", "#type=recovery&access_token=a&refresh_token=r&error=access_denied"]) {
    assert.throws(() => parseAuthCallback(`attendance://auth-callback${suffix}`));
  }
  assert.throws(() => parseAuthCallback("not a URL"));
});

test("errors in email links do not expose provider details to the UI", () => {
  assert.throws(() => parseAuthCallback("attendance://auth-callback#error=access_denied&error_description=private-provider-detail"), (error) => {
    assert.ok(!error.message.includes("private-provider-detail"));
    return true;
  });
});

test("account statuses give the student a relevant next step", () => {
  assert.equal(authFeedback("Email not confirmed").verification, true);
  assert.equal(authFeedback("Your registration needs admin review before you can log in.").title, "Registration under review");
  assert.equal(authFeedback("Your student account is inactive.").title, "Account needs attention");
  assert.equal(authFeedback("Invalid login credentials").title, "Unable to sign in");
  assert.equal(authFeedback("Network request failed").title, "Connection interrupted");
  assert.equal(authFeedback("email rate limit exceeded").title, "Please wait before retrying");
  assert.ok(!authFeedback("internal database error details").message.includes("database"));
});
