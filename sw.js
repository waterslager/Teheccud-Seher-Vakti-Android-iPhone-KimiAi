const CACHE_NAME = 'kiyamul-leyl-v4';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './192.png',
    './512.png'
];

// Ağ isteğini bir zaman aşımıyla sarmalar. Bağlantı sonsuza dek askıda
// kalırsa (WiFi geçişi, zayıf sinyal vb.) timeoutMs sonra reddeder,
// böylece çağıran taraf cache'e düşebilir. Bunsuz, index.html'in kendi
// yüklenme isteği askıda kaldığında sayfa hiç boyanmıyor ve uygulama
// açılış logosunda sonsuza dek takılı kalıyordu.
function fetchWithTimeout(request, options, timeoutMs) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
        fetch(request, options).then((res) => {
            clearTimeout(timer);
            resolve(res);
        }).catch((err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            Promise.all(APP_SHELL.map((url) =>
                fetchWithTimeout(url, { cache: 'reload' }, 10000)
                    .then((res) => cache.put(url, res))
                    .catch(() => {}) // tek bir asset zaman aşımına uğrarsa kurulumun tamamını bloklamasın
            ))
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

    event.respondWith(
        fetchWithTimeout(event.request, { cache: 'no-store' }, 4000)
            .catch(() => caches.match(event.request))
            .then((res) => res || new Response(
                'Çevrimdışısınız ve bu sayfa önbellekte yok.',
                { status: 503, statusText: 'Offline' }
            ))
    );
});
