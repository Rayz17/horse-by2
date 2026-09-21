const CACHE = 'horse-merge-shell-v2';
const SHELL = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => undefined)
  );
});

// 激活时清掉旧版本缓存，避免发新版后用户永远停留在旧 shell
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .catch(() => undefined)
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isShell = url.pathname.endsWith('index.html') || url.pathname.endsWith('/') || url.pathname.includes('/assets/ui/');
  if (!isShell || event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => undefined);
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
