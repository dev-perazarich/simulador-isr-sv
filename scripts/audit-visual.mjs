import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = resolve(process.argv[2]);
const OUT = resolve(process.argv[3]);
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = join(ROOT, p);
  if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404); res.end('404'); return;
  }
  const body = await readFile(file);
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(body);
});

await new Promise((r) => server.listen(4173, r));
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EDGE, headless: true });

const errores = [];
const VIEWPORTS = [
  { name: 'movil', width: 390, height: 844, dsf: 2 },
  { name: 'escritorio', width: 1440, height: 900, dsf: 1 },
];
const PAGINAS = [
  '/',
  '/guia.html',
  '/salario.html',
  '/liquidaciones.html',
  '/isr-anual.html',
  '/comparador.html',
  '/autor.html',
  '/donaciones.html',
  '/legal/privacidad.html',
];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dsf,
    colorScheme: 'light',
  });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errores.push(`[${vp.name}] console: ${m.text()}`); });
  page.on('pageerror', (e) => errores.push(`[${vp.name}] pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errores.push(`[${vp.name}] request fallida: ${r.url()}`));

  for (const ruta of PAGINAS) {
    await page.goto(`http://localhost:4173${ruta}`, { waitUntil: 'networkidle' });

    // Tailwind se compila en el navegador: hay que esperar a que resuelva
    // las utilidades antes de medir o capturar nada.
    try {
      await page.waitForFunction(
        () => {
          const el = document.querySelector('.max-w-content');
          return el && getComputedStyle(el).maxWidth === '1280px';
        },
        { timeout: 8000 }
      );
    } catch {
      errores.push(`[${vp.name}] ${ruta}: Tailwind no resolvió las utilidades`);
    }

    // Comprueba que los colores propios de la configuración existen
    const marca = await page.evaluate(() => {
      const el = document.querySelector('.text-brand-600, .bg-brand-600, .text-brand-400');
      if (!el) return 'sin-elemento';
      const cs = getComputedStyle(el);
      return cs.color + ' | ' + cs.backgroundColor;
    });
    if (marca !== 'sin-elemento' && !/rgb\(/.test(marca)) {
      errores.push(`[${vp.name}] ${ruta}: los colores de marca no se aplicaron`);
    }

    // Interacción: llenar y calcular donde aplique
    if (ruta === '/salario.html') {
      await page.fill('#salario', '1200');
      await page.click('button:has-text("Calcular")');
      await page.waitForTimeout(400);
    }
    if (ruta === '/liquidaciones.html') {
      await page.fill('#liq-salario', '900');
      await page.fill('#f-inicio', '2019-03-15');
      await page.click('button:has-text("Calcular")');
      await page.waitForTimeout(400);
    }
    if (ruta === '/isr-anual.html') {
      await page.fill('#rapido', '1200');
      await page.click('button:has-text("Aplicar a los 12")');
      await page.click('button:has-text("Simular mi declaración")');
      await page.waitForTimeout(400);
    }
    if (ruta === '/comparador.html') {
      await page.fill('#monto', '1500');
      await page.click('button:has-text("Comparar")');
      await page.waitForTimeout(400);
    }

    // Desbordamiento horizontal
    const overflow = await page.evaluate(() => {
      const de = document.documentElement;
      return { scrollW: de.scrollWidth, clientW: de.clientWidth };
    });
    if (overflow.scrollW > overflow.clientW + 1) {
      errores.push(`[${vp.name}] ${ruta}: scroll horizontal (${overflow.scrollW} > ${overflow.clientW})`);
    }

    const nombre = ruta === '/' ? 'inicio' : ruta.replace(/[/.]/g, '').replace('html', '');
    await page.screenshot({ path: join(OUT, `${vp.name}-${nombre}.png`), fullPage: false });
  }
  await ctx.close();
}

// Una captura en modo oscuro
const dark = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
const dp = await dark.newPage();
await dp.goto('http://localhost:4173/salario.html', { waitUntil: 'networkidle' });
await dp.fill('#salario', '1200');
await dp.click('button:has-text("Calcular")');
await dp.waitForTimeout(400);
await dp.screenshot({ path: join(OUT, 'oscuro-salario.png') });
await dark.close();

await browser.close();
server.close();

console.log(errores.length ? 'PROBLEMAS:\n' + [...new Set(errores)].join('\n') : 'Sin errores de consola ni desbordamiento.');
