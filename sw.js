const CACHE_NAME = 'kiyamul-leyl-v12';
const APP_SHELL = ['./', './index.html', './manifest.json', './192.png', './512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        APP_SHELL.map((url) =>
          fetch(url, { cache: 'reload' })
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
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(staleWhileRevalidate(event.request));
});

// Uygulama kabuğu (HTML/CSS/JS/ikonlar) her zaman önbellekten, ağdan
// bağımsız ve gecikmesiz olarak sunulur — bir "zaman aşımı" kavramı ve
// buna bağlı yanlış "çevrimdışı" hatası artık söz konusu değil.
// Güncelleme arka planda sessizce indirilip önbelleğe yazılır; kullanıcı
// bunu beklemez, güncel sürümü bir sonraki açılışta görür.
function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then((cache) =>
    cache.match(request, { ignoreSearch: true }).then((cached) => {
      const networkUpdate = fetch(request)
        .then((res) => {
          if (res && res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => null);

      if (cached) {
        // networkUpdate zaten arka planda çalışmaya başladı; kullanıcıyı
        // bekletmeden önbellekteki sürümü hemen döndürüyoruz.
        return cached;
      }

      // İlk ziyaret / önbellek boş: ağı bekle, o da başarısız olursa
      // en azından uygulama kabuğuna (index.html) düş.
      return networkUpdate
        .then((res) => res || caches.match('./index.html'))
        .then((res) => res || new Response(
          'Çevrimdışısınız ve bu sayfa önbellekte yok.',
          { status: 503, statusText: 'Offline' }
        ));
    })
  );
}
