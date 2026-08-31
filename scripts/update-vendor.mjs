// ============================================================
// update-vendor.mjs — Actualiza las librerías de /vendor
// ------------------------------------------------------------
// El sitio no usa CDNs en tiempo de ejecución: Vue, jsPDF y el
// compilador de Tailwind viven en /vendor y se sirven desde el
// propio dominio.
//
// Esto NO es un paso de construcción: el sitio funciona con lo
// que ya está en /vendor. Ejecútalo solo cuando quieras subir de
// versión alguna librería:
//
//     node scripts/update-vendor.mjs
//
// Después recarga el sitio y corre `npm run audit:visual`.
// ============================================================

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = join(ROOT, 'vendor');

// Versiones fijadas a propósito: una actualización silenciosa de una
// librería no debería poder romper una calculadora fiscal.
const LIBRERIAS = [
  {
    archivo: 'vue.global.prod.js',
    url: 'https://unpkg.com/vue@3.5.41/dist/vue.global.prod.js',
    nota: 'Vue 3 — build completo con compilador de plantillas',
  },
  {
    archivo: 'jspdf.umd.min.js',
    url: 'https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js',
    nota: 'jsPDF — se carga bajo demanda al exportar',
  },
  {
    archivo: 'tailwind.js',
    url: 'https://cdn.tailwindcss.com/3.4.17',
    nota: 'Tailwind Play CDN — resuelve las utilidades en el navegador',
  },
];

await mkdir(DESTINO, { recursive: true });

let fallos = 0;
for (const lib of LIBRERIAS) {
  process.stdout.write(`  ${lib.archivo.padEnd(24)} `);
  try {
    const res = await fetch(lib.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const texto = await res.text();
    if (texto.length < 1024) throw new Error('respuesta sospechosamente corta');
    await writeFile(join(DESTINO, lib.archivo), texto, 'utf8');
    console.log(`${(texto.length / 1024).toFixed(0).padStart(4)} KB  · ${lib.nota}`);
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    fallos++;
  }
}

if (fallos) {
  console.error(`\n${fallos} librería(s) no se pudieron actualizar. Las anteriores siguen en /vendor.`);
  process.exit(1);
}
console.log('\nListo. Recarga el sitio y verifica con: npm run audit:visual');
