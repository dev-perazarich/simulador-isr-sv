// ============================================================
// sw.js — Service Worker de RentaSV
// ------------------------------------------------------------
// Estrategia deliberada para una herramienta legal:
//
//   • HTML, CSS y JS  → RED PRIMERO (con respaldo en caché).
//     Si la Asamblea reforma una tabla, nadie debe quedarse con
//     cifras viejas por tener el sitio cacheado. Son archivos
//     pequeños, así que el costo es mínimo.
//   • Fuentes, imágenes y librerías → CACHÉ PRIMERO.
//     No cambian y son lo pesado.
// ============================================================

const VERSION = 'v2.2.0';
const CACHE = `rentasv-${VERSION}`;

const PRECACHE = [
  '/',
  '/index.html',
  '/guia.html',
  '/salario.html',
  '/liquidaciones.html',
  '/isr-anual.html',
  '/comparador.html',
  '/autor.html',
  '/donaciones.html',
  '/legal/privacidad.html',
  '/legal/terminos.html',
  '/manifest.json',
  '/favicon.svg',
  '/css/app.css',
  // Núcleo
  '/js/shell.js',
  '/js/app-salario.js',
  '/js/app-liquidaciones.js',
  '/js/app-isranual.js',
  '/js/app-comparador.js',
  '/js/modules/constants.js',
  '/js/modules/calculator.js',
  '/js/modules/storage.js',
  '/js/composables/useShared.js',
  '/js/composables/useSalarioTab.js',
  '/js/composables/useLiquidacionesTab.js',
  '/js/composables/useDeclaracionTab.js',
  '/js/composables/useComparadorTab.js',
  '/js/services/PDFService.js',
  // Librerías servidas desde el propio dominio
  '/vendor/tailwind.js',
  '/vendor/vue.global.prod.js',
  '/vendor/jspdf.umd.min.js',
  // Recursos
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/qr-banco-agricola.jpeg',
];

const CDN_PERMITIDOS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// ── Instalación ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      // Uno por uno: si un archivo falla, el resto igual se guarda.
      // Con cache.addAll() un solo 404 aborta toda la instalación.
      await Promise.all(
        PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {
            console.warn('[sw] no se pudo precachear', url);
          })
        )
      );
      await self.skipWaiting();
    })
  );
});

// ── Activación ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const claves = await caches.keys();
      await Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })()
  );
});

// ── Estrategias ──────────────────────────────────────────────
async function redPrimero(event) {
  const cache = await caches.open(CACHE);
  try {
    const precargada = event.preloadResponse ? await event.preloadResponse : null;
    const respuesta = precargada || (await fetch(event.request));
    if (respuesta && respuesta.ok && respuesta.type === 'basic') {
      cache.put(event.request, respuesta.clone());
    }
    return respuesta;
  } catch (e) {
    const cacheada = await cache.match(event.request);
    if (cacheada) return cacheada;
    if (event.request.mode === 'navigate') {
      const inicio = await cache.match('/index.html');
      if (inicio) return inicio;
    }
    throw e;
  }
}

async function cachePrimero(request) {
  const cache = await caches.open(CACHE);
  const cacheada = await cache.match(request);
  if (cacheada) return cacheada;
  const respuesta = await fetch(request);
  if (respuesta && (respuesta.ok || respuesta.type === 'opaque')) {
    cache.put(request, respuesta.clone());
  }
  return respuesta;
}

// ── Enrutado ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const propio = url.origin === self.location.origin;
  const esCDN = CDN_PERMITIDOS.some((h) => url.hostname.endsWith(h));
  if (!propio && !esCDN) return;

  // Fuentes externas: no cambian nunca.
  if (esCDN) {
    event.respondWith(cachePrimero(request));
    return;
  }

  // Librerías e imágenes propias: inmutables dentro de una versión.
  if (url.pathname.startsWith('/vendor/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cachePrimero(request));
    return;
  }

  // Todo lo demás (HTML, CSS, JS): la versión fresca manda.
  event.respondWith(redPrimero(event));
});

// Permite que la página fuerce la activación de una versión nueva.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
