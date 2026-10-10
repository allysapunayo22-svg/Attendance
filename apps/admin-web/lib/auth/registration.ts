export function registrationRedirectUrl(origin: string) {
  return `${origin}/auth/callback?type=signup`;
}

export function normalizeStudentId(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}
