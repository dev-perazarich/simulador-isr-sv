// sw.js — Service Worker · Estrategia: Cache First
// Simulador ISR El Salvador 2026

const CACHE_NAME = 'simulador-isr-sv-v1.2.1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/salario.html',
  '/liquidaciones.html',
  '/isr-anual.html',
  '/comparador.html',
  '/autor.html',
  '/donaciones.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/qr-banco-agricola.jpeg',
  // ── CSS: design system ──
  '/css/app.css',
  // ── JS: módulos del núcleo ──
  '/js/main.js',
  '/js/app-salario.js',
  '/js/app-liquidaciones.js',
  '/js/app-isranual.js',
  '/js/app-comparador.js',
  '/js/modules/constants.js',
  '/js/modules/calculator.js',
  '/js/modules/storage.js',
  // ── JS: composables ──
  '/js/composables/useShared.js',
  '/js/composables/useTheme.js',
  '/js/composables/useSalarioTab.js',
  '/js/composables/useLiquidacionesTab.js',
  '/js/composables/useDeclaracionTab.js',
  '/js/composables/useComparadorTab.js',
  // ── JS: servicios ──
  '/js/services/PDFService.js',
  // CDN assets se cachean en primer uso (ver fetch handler)
];

// ── Install: pre-cachear assets propios ──────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: limpiar caches viejos ──────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache First con fallback a red ────────────────────
self.addEventListener('fetch', (event) => {
  // Solo manejar GET requests
  if (event.request.method !== 'GET') return;

  // No interceptar solicitudes de terceros excepto CDN conocidos
  const url = new URL(event.request.url);
  const isOwnAsset = url.origin === self.location.origin;
  const isCDN = [
    'cdn.tailwindcss.com',
    'unpkg.com',
    'cdnjs.cloudflare.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
  ].some((cdn) => url.hostname.includes(cdn));

  if (!isOwnAsset && !isCDN) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cachear respuestas válidas
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(() => {
        // Fallback offline: si es navegación, retornar index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});