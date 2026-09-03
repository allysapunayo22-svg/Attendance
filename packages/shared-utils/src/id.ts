export function createLocalId(prefix = "local") {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function createIdempotencyKey(parts: Array<string | number | boolean | null | undefined>) {
  return parts.filter((part) => part !== null && part !== undefined).join(":");
}
