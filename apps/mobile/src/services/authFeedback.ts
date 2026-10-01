export function authFeedback(message: string) {
  if (/email.*(not confirmed|not verified)|email_not_confirmed/i.test(message)) {
    return { title: "Confirm your school email", message: "Open the confirmation email before signing in. If it hasn’t arrived, request another below.", verification: true };
  }
  if (/admin review|pending review/i.test(message)) {
    return { title: "Registration under review", message: "The CBEA office needs to review your registration. Contact the office with your student ID for an update.", verification: false };
  }
  if (/inactive|rejected|no active|no approved|not eligible/i.test(message)) {
    return { title: "Account needs attention", message: "Check your student ID and school email. If they are correct, ask the CBEA office to check your roster record and account status.", verification: false };
  }
  if (/invalid login credentials|invalid_credentials/i.test(message)) {
    return { title: "Unable to sign in", message: "Your student ID, email, or password is incorrect. Try again or reset your password.", verification: false };
  }
  if (/network|fetch|connection/i.test(message)) {
    return { title: "Connection interrupted", message: "Check your internet connection and try again. Your entries have been kept.", verification: false };
  }
  if (/rate limit|too many|security purposes|over_email_send_rate_limit/i.test(message)) {
    return { title: "Please wait before retrying", message: "Too many requests were made. Wait a minute and try again.", verification: false };
  }
  return { title: "Unable to continue", message: "Please try again. If the problem continues, contact the CBEA office for help.", verification: false };
}

export function parseAuthCallback(url: string) {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.search);
  new URLSearchParams(parsed.hash.replace(/^#/, "")).forEach((value, key) => params.set(key, value));
  if (params.has("error") || params.has("error_code")) throw new Error("This email link has expired or is no longer valid. Request a new one.");
  const type = params.get("type");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if ((type !== "recovery" && type !== "signup") || !accessToken || !refreshToken) {
    throw new Error("Open the latest confirmation or password reset link from your school email.");
  }
  return { type, accessToken, refreshToken };
}
