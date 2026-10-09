export const RECOVERY_CALLBACK_PATH = "/auth/callback?type=recovery";
export const RECOVERY_COOKIE_NAME = "clickin_recovery_user";
export const RECOVERY_COOKIE_MAX_AGE_SECONDS = 15 * 60;

export function recoveryRedirectUrl(origin: string) {
  const url = new URL(RECOVERY_CALLBACK_PATH, origin);
  return url.toString();
}

export function isRecoveryCallback(type: string | null, code: string | null) {
  return type === "recovery" && typeof code === "string" && code.length >= 8;
}
