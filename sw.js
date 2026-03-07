// ============================================
// SERVICE WORKER - PWA
// MindSet Capital
// ============================================

const CACHE_NAME = 'mindset-capital-v5';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './js/storage.js',
    './js/clientes.js',
    './js/prestamos.js',
    './js/pagos.js',
    './js/dashboard.js',
    './js/analytics.js',
    './js/simulador.js',
    './js/chatbot.js',
    './assets/icon-192.png',
    './assets/icon-512.png',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js'
];

// Instalación
self.addEventListener('install', event => {
    console.log('[SW] Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Cacheando archivos');
                return cache.addAll(urlsToCache);
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
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                });
            })
            .catch(() => {
                // Si falla, intentar devolver la página principal
                return caches.match('./index.html');
            })
    );
});
