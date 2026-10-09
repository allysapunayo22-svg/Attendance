export const BROWSER_IDENTITY_STORAGE_KEY = "clickin_browser_device_identity_v1";

export type BrowserDeviceStatus =
  | "no_browser_identity"
  | "unregistered"
  | "another_device_active"
  | "inactive"
  | "active";

export interface BrowserDeviceState {
  status: BrowserDeviceStatus;
  deviceId: string | null;
  anotherDeviceActive: boolean;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface CryptoLike {
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
  subtle: Pick<SubtleCrypto, "digest">;
}

interface RpcResult {
  data: unknown;
  error: { message?: string } | null;
}

export interface BrowserDeviceRpcClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<RpcResult>;
}

function browserStorage(): StorageLike {
  if (typeof window === "undefined" || !window.localStorage) throw new Error("Browser storage is unavailable.");
  return window.localStorage;
}

function browserCrypto(): CryptoLike {
  if (typeof window === "undefined" || !window.crypto?.subtle) throw new Error("Secure browser identity is unavailable.");
  return window.crypto;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function getStoredBrowserIdentity(storage: StorageLike = browserStorage()) {
  return storage.getItem(BROWSER_IDENTITY_STORAGE_KEY);
}

export function getOrCreateBrowserIdentity(
  storage: StorageLike = browserStorage(),
  cryptoProvider: CryptoLike = browserCrypto()
) {
  const existing = getStoredBrowserIdentity(storage);
  if (existing) return existing;

  const randomBytes = cryptoProvider.getRandomValues(new Uint8Array(32));
  const identity = bytesToBase64Url(randomBytes);
  storage.setItem(BROWSER_IDENTITY_STORAGE_KEY, identity);
  return identity;
}

export async function hashBrowserIdentity(identity: string, cryptoProvider: CryptoLike = browserCrypto()) {
  const digest = await cryptoProvider.subtle.digest("SHA-256", new TextEncoder().encode(identity));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function parseDeviceState(value: unknown): BrowserDeviceState {
  if (!value || typeof value !== "object") throw new Error("The device service returned an invalid response.");
  const payload = value as Record<string, unknown>;
  const status = payload.status;
  if (!["unregistered", "another_device_active", "inactive", "active"].includes(String(status))) {
    throw new Error("The device service returned an unknown status.");
  }

  const deviceId = typeof payload.device_id === "string" ? payload.device_id : null;
  if (status === "active" && !deviceId) throw new Error("The device service did not return an active device.");

  return {
    status: status as BrowserDeviceStatus,
    deviceId,
    anotherDeviceActive: payload.another_device_active === true
  };
}

function rpcError(error: { message?: string } | null, fallback: string) {
  return new Error(error?.message || fallback);
}

export async function resolveCurrentBrowserDevice(
  client: BrowserDeviceRpcClient,
  dependencies: { storage?: StorageLike; crypto?: CryptoLike } = {}
): Promise<BrowserDeviceState> {
  const storage = dependencies.storage ?? browserStorage();
  const identity = getStoredBrowserIdentity(storage);
  if (!identity) return { status: "no_browser_identity", deviceId: null, anotherDeviceActive: false };

  const fingerprintHash = await hashBrowserIdentity(identity, dependencies.crypto ?? browserCrypto());
  const { data, error } = await client.rpc("resolve_student_device_v1", {
    p_fingerprint_hash: fingerprintHash
  });
  if (error) throw rpcError(error, "Unable to verify this browser.");
  return parseDeviceState(data);
}

export async function registerCurrentBrowser(
  client: BrowserDeviceRpcClient,
  dependencies: { storage?: StorageLike; crypto?: CryptoLike; browserLabel?: string } = {}
): Promise<BrowserDeviceState> {
  const storage = dependencies.storage ?? browserStorage();
  const cryptoProvider = dependencies.crypto ?? browserCrypto();
  const identity = getOrCreateBrowserIdentity(storage, cryptoProvider);
  const fingerprintHash = await hashBrowserIdentity(identity, cryptoProvider);
  const { data, error } = await client.rpc("register_student_device_v1", {
    p_fingerprint_hash: fingerprintHash,
    p_browser_label: dependencies.browserLabel ?? "Web Browser"
  });
  if (error) throw rpcError(error, "Unable to register this browser.");
  return parseDeviceState(data);
}

export function canBeginAttendance(state: BrowserDeviceState) {
  return state.status === "active" && Boolean(state.deviceId);
}

export function browserDeviceStatusCopy(status: BrowserDeviceStatus, anotherDeviceActive = false) {
  switch (status) {
    case "active":
      return { title: "This browser is active", description: "This browser is ready to be used for attendance.", tone: "success" as const };
    case "inactive":
      return {
        title: "This browser is no longer active",
        description: anotherDeviceActive ? "Another phone or browser is now the active attendance device." : "Register this browser again before recording attendance.",
        tone: "warning" as const
      };
    case "another_device_active":
      return { title: "Another device is currently active", description: "Register this browser to make it your active attendance device.", tone: "warning" as const };
    case "unregistered":
      return { title: "No browser registered", description: "Register this browser before recording attendance.", tone: "neutral" as const };
    default:
      return { title: "Registration required before attendance", description: "This browser has not been registered for attendance.", tone: "neutral" as const };
  }
}
