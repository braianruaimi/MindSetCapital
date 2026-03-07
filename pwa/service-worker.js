// ============================================
// SERVICE WORKER - PWA
// ============================================

const CACHE_NAME = 'mindset-capital-v3';
const BASE_PATH = '/MindSetCapital';

const urlsToCache = [
    `${BASE_PATH}/`,
    `${BASE_PATH}/index.html`,
    `${BASE_PATH}/styles.css`,
    `${BASE_PATH}/app.js`,
    `${BASE_PATH}/js/storage.js`,
    `${BASE_PATH}/js/clientes.js`,
    `${BASE_PATH}/js/prestamos.js`,
    `${BASE_PATH}/js/pagos.js`,
    `${BASE_PATH}/js/dashboard.js`,
    `${BASE_PATH}/js/analytics.js`,
    `${BASE_PATH}/js/simulador.js`,
    `${BASE_PATH}/js/chatbot.js`,
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
    console.log('[SW] Instalando Service Worker...');
    console.log('[SW] Base Path:', BASE_PATH);
    console.log('[SW] URLs a cachear:', urlsToCache);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Cache abierto');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('[SW] ✅ Todos los archivos cacheados');
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('[SW] ❌ Error al cachear archivos:', err);
            })
    );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
    console.log('[SW] Activando Service Worker...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Eliminando cache antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] ✅ Service Worker activado');
            return self.clients.claim();
        })
    );
});

// Intercepción de peticiones
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - devolver respuesta del cache
                if (response) {
                    return response;
                }

                // Clone de la petición
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest)
                    .then(response => {
                        // Verificar si es una respuesta válida
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone de la respuesta
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Si no hay conexión, devolver página offline
                        return caches.match('/index.html');
                    });
            })
    );
});

// Manejo de mensajes
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
