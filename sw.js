// ============================================
// SERVICE WORKER - PWA
// MindSet Capital
// ============================================

const CACHE_NAME = 'mindset-capital-v6';
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './js/security.js',
    './js/backup.js',
    './js/storage.js',
    './js/clientes.js',
    './js/prestamos.js',
    './js/pagos.js',
    './js/dashboard.js',
    './js/analytics.js',
    './js/simulador.js',
    './js/chatbot.js',
    './js/perfil.js',
    './manifest.json',
    './assets/icon-192.png',
    './assets/icon-512.png',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Instalación
self.addEventListener('install', event => {
    console.log('[SW] Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Cacheando archivos');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] ✅ Instalado correctamente');
                return self.skipWaiting();
            })
            .catch(err => console.error('[SW] Error en instalación:', err))
    );
});

// Activación
self.addEventListener('activate', event => {
    console.log('[SW] Activando...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Limpiando cache antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] ✅ Activado');
            return self.clients.claim();
        })
    );
});

// Interceptar peticiones
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') {
        return;
    }

    const requestUrl = new URL(event.request.url);
    const isSameOrigin = requestUrl.origin === self.location.origin;

    event.respondWith((async () => {
        try {
            // Navegación HTML: network-first con fallback a cache
            if (event.request.mode === 'navigate') {
                try {
                    const networkResponse = await fetch(event.request);
                    return networkResponse;
                } catch {
                    return await caches.match('./index.html');
                }
            }

            // Archivos estáticos: cache-first
            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) {
                return cachedResponse;
            }

            // Fetch de red y cache en runtime
            const networkResponse = await fetch(event.request);

            if (networkResponse && networkResponse.ok && (isSameOrigin || requestUrl.protocol.startsWith('http'))) {
                const responseToCache = networkResponse.clone();
                const cache = await caches.open(CACHE_NAME);
                cache.put(event.request, responseToCache);
            }

            return networkResponse;
        } catch (error) {
            // Fallback por tipo de recurso para evitar devolver HTML a JS/CSS
            if (event.request.destination === 'document') {
                return await caches.match('./index.html');
            }

            if (event.request.destination === 'style') {
                return await caches.match('./styles.css');
            }

            // Para scripts y otros recursos devolver una respuesta controlada
            return new Response('', {
                status: 503,
                statusText: 'Offline resource unavailable'
            });
        }
    })());
});
