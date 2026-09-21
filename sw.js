const CACHE_NAME = 'kiyamul-leyl-v8';
const APP_SHELL = ['./', './index.html', './manifest.json', './192.png', './512.png'];
const TIMEOUT_MS = 4000;

// Ağ isteğini bir zaman aşımıyla sarmalar; bağlantı askıda kalırsa
// belirtilen süre sonunda reddedip önbelleğe düşülmesini sağlar.
function fetchWithTimeout(request, options, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    fetch(request, options)
      .then((res) => { clearTimeout(timer); resolve(res); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        APP_SHELL.map((url) =>
          fetchWithTimeout(url, { cache: 'reload' }, 10000)
            .then((res) => cache.put(url, res))
            .catch(() => {}) // tek bir asset başarısız olursa kurulumun tamamını bloklamasın
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = event.request.mode === 'navigate';

  event.respondWith(
    fetchWithTimeout(event.request, { cache: 'no-store' }, TIMEOUT_MS)
      .catch(() =>
        caches.match(event.request, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          // start_url farklı sorgu parametreleriyle açılmışsa son çare index.html
          return isNavigation ? caches.match('./index.html') : undefined;
        })
      )
      .then(
        (res) =>
          res ||
          new Response('Çevrimdışısınız ve bu sayfa önbellekte yok.', {
            status: 503,
            statusText: 'Offline'
          })
      )
  );
});
