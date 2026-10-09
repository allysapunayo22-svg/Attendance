const SHELL_CACHE = "clickin-student-shell-v4";
const SAFE_SHELL = ["/offline", "/manifest.webmanifest", "/logo.png", "/pwa/icon-192.png", "/pwa/icon-512.png", "/pwa/icon-maskable-512.png"];

async function cacheOfflineShell() {
  const cache = await caches.open(SHELL_CACHE);
  const response = await fetch("/offline", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to prepare the offline shell.");
  await cache.put("/offline", response.clone());
  const html = await response.text();
  const staticAssets = [...html.matchAll(/(?:src|href)=["'](\/_next\/static\/[^"']+)["']/g)].map((match) => match[1]);
  await cache.addAll([...new Set([...SAFE_SHELL.slice(1), ...staticAssets])]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheOfflineShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("clickin-student-shell-") && key !== SHELL_CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request, { cache: "no-store" }).catch(async () => {
      const cache = await caches.open(SHELL_CACHE);
      return (await cache.match("/offline")) || Response.error();
    }));
    return;
  }

  const safeStatic = url.pathname.startsWith("/_next/static/")
    || url.pathname.startsWith("/pwa/")
    || ["/manifest.webmanifest", "/logo.png", "/favicon.png"].includes(url.pathname);
  if (!safeStatic) return;

  event.respondWith((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  })());
});
