// ============================================================
// Pruebas de sincronía entre las páginas y constants.js
// ------------------------------------------------------------
// El sitio no se compila: los .html se editan a mano, así que las
// cifras impresas en la portada y en la guía pueden quedarse atrás
// cuando se actualiza un parámetro en constants.js.
//
// Estas pruebas son la red que impide esa deriva silenciosa. Si
// alguna falla, busque el número viejo en el HTML y corríjalo.
// ============================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DATA_2026 } from '../js/modules/constants.js';
import { formatUSD, calcularSalarioNeto } from '../js/modules/calculator.js';

const leer = (archivo) => readFileSync(new URL(`../${archivo}`, import.meta.url), 'utf8');

const PORTADA = leer('index.html');
const GUIA = leer('guia.html');

/** Reproduce cómo se imprime un rango de tramo en las tablas del HTML. */
function filaTramo(t) {
  return t.hasta === Infinity
    ? `${formatUSD(t.desde)} en adelante`
    : `${formatUSD(t.desde)} – ${formatUSD(t.hasta)}`;
}

function exigir(html, texto, donde, concepto) {
  assert.ok(
    html.includes(texto),
    `${donde} ya no muestra ${concepto}: falta «${texto}». ` +
      `Actualícelo para que coincida con constants.js.`
  );
}

// ════════════════════════════════════════════════════════════
describe('Las tablas publicadas coinciden con constants.js', () => {
  test('portada — tabla de retención mensual', () => {
    for (const t of DATA_2026.ISR_TRAMOS_MENSUAL) {
      exigir(PORTADA, filaTramo(t), 'index.html', `el tramo ${t.label}`);
      exigir(PORTADA, formatUSD(t.cuotaFija), 'index.html', `la cuota fija de ${t.label}`);
    }
  });

  test('portada — tabla anual', () => {
    for (const t of DATA_2026.ISR_TRAMOS_ANUAL) {
      exigir(PORTADA, filaTramo(t), 'index.html', `el tramo anual ${t.label}`);
    }
  });

  test('portada — salarios mínimos por sector', () => {
    for (const s of Object.values(DATA_2026.SALARIOS_MINIMOS)) {
      exigir(PORTADA, s.label, 'index.html', `el sector ${s.label}`);
      exigir(PORTADA, formatUSD(s.mensual), 'index.html', `el mínimo de ${s.label}`);
      exigir(PORTADA, formatUSD(s.diario), 'index.html', `el diario de ${s.label}`);
    }
  });

  test('guía — tablas mensual, quincenal y semanal', () => {
    const tablas = [
      ['mensual', DATA_2026.ISR_TRAMOS_MENSUAL],
      ['quincenal', DATA_2026.ISR_TRAMOS_QUINCENAL],
      ['semanal', DATA_2026.ISR_TRAMOS_SEMANAL],
    ];
    for (const [nombre, tramos] of tablas) {
      for (const t of tramos) {
        exigir(GUIA, filaTramo(t), 'guia.html', `el tramo ${nombre} ${t.label}`);
      }
    }
  });
});

// ════════════════════════════════════════════════════════════
describe('Los montos clave publicados siguen vigentes', () => {
  const CLAVES = () => [
    [formatUSD(DATA_2026.ISR_TRAMOS_MENSUAL[0].hasta), 'la base exenta mensual'],
    [formatUSD(DATA_2026.ISR_TRAMOS_ANUAL[0].hasta), 'la base exenta anual'],
    [formatUSD(DATA_2026.DESCUENTOS.ISSS.tope), 'el tope del ISSS'],
    [formatUSD(DATA_2026.DESCUENTOS.AFP.tope), 'el tope de la AFP'],
    [formatUSD(DATA_2026.AGUINALDO.EXENCION_ISR), 'la exención del aguinaldo'],
    [formatUSD(DATA_2026.INDEMNIZACION.TOPE_SALARIO_DIARIO), 'el tope de la indemnización'],
    [formatUSD(DATA_2026.DEDUCCIONES_ANUALES.DEDUCCION_FIJA.monto), 'la deducción fija'],
    [formatUSD(DATA_2026.DEDUCCIONES_ANUALES.DEDUCCION_FIJA.rentaMaxima), 'el límite de la deducción fija'],
  ];

  test('la portada los muestra todos', () => {
    for (const [monto, concepto] of CLAVES()) exigir(PORTADA, monto, 'index.html', concepto);
  });

  test('la guía los muestra todos', () => {
    for (const [monto, concepto] of CLAVES()) exigir(GUIA, monto, 'guia.html', concepto);
  });

  test('la base de cotización del ISSS aparece en ambas', () => {
    const base = formatUSD(DATA_2026.DESCUENTOS.ISSS.baseMaxima);
    exigir(PORTADA, base, 'index.html', 'la base máxima del ISSS');
    exigir(GUIA, base, 'guia.html', 'la base máxima del ISSS');
  });
});

// ════════════════════════════════════════════════════════════
describe('El ejemplo de la portada sale del mismo motor', () => {
  // La tarjeta del hero muestra el desglose de un salario de $1,200.
  const EJ = calcularSalarioNeto(1200);

  test('cada cifra del ejemplo coincide con el cálculo real', () => {
    const filas = [
      [EJ.salarioBruto, 'el salario bruto'],
      [EJ.descuentoISSS, 'el ISSS'],
      [EJ.descuentoAFP, 'la AFP'],
      [EJ.rentaNetaImponible, 'la base imponible'],
      [EJ.isrMensual, 'el ISR'],
      [EJ.salarioNeto, 'el neto'],
    ];
    for (const [valor, concepto] of filas) {
      exigir(PORTADA, formatUSD(valor), 'index.html', `${concepto} del ejemplo`);
    }
  });

  test('el tramo mostrado en el ejemplo es el correcto', () => {
    exigir(PORTADA, `Tramo ${EJ.tramoISR.label}`, 'index.html', 'el tramo del ejemplo');
  });

  test('la guía repite el mismo ejemplo', () => {
    exigir(GUIA, formatUSD(EJ.salarioNeto), 'guia.html', 'el neto del ejemplo');
    exigir(GUIA, formatUSD(EJ.rentaNetaImponible), 'guia.html', 'la base del ejemplo');
  });
});

// ════════════════════════════════════════════════════════════
describe('Coherencia general del sitio', () => {
  const PAGINAS = [
    'index.html', 'guia.html', 'salario.html', 'liquidaciones.html',
    'isr-anual.html', 'comparador.html', 'autor.html', 'donaciones.html',
    'legal/privacidad.html', 'legal/terminos.html',
  ];

  test('todas las páginas cargan el CSS y el Tailwind vendorizado', () => {
    for (const p of PAGINAS) {
      const h = leer(p);
      assert.ok(h.includes('/css/app.css'), `${p} no enlaza el sistema de diseño`);
      assert.ok(h.includes('/vendor/tailwind.js'), `${p} no carga Tailwind vendorizado`);
      assert.ok(h.includes('tailwind.config'), `${p} no define la configuración de Tailwind`);
    }
  });

  test('ninguna página depende de un CDN de terceros para funcionar', () => {
    // Solo se admite Google Fonts, que degrada a la fuente del sistema.
    const PROHIBIDOS = ['cdn.tailwindcss.com', 'unpkg.com', 'cdnjs.cloudflare.com', 'jsdelivr.net', 'code.iconify.design'];
    for (const p of PAGINAS) {
      const h = leer(p);
      for (const cdn of PROHIBIDOS) {
        assert.ok(!h.includes(cdn), `${p} volvió a depender de ${cdn}`);
      }
    }
  });

  test('la versión publicada coincide con constants.js', () => {
    for (const p of ['autor.html', 'legal/privacidad.html', 'legal/terminos.html']) {
      exigir(leer(p), DATA_2026.VERSION, p, 'la versión vigente');
    }
  });

  test('el Service Worker precachea todo lo que el sitio necesita', () => {
    const sw = leer('sw.js');
    const IMPRESCINDIBLES = [
      '/css/app.css',
      '/vendor/tailwind.js',
      '/vendor/vue.global.prod.js',
      '/js/modules/calculator.js',
      ...PAGINAS.map((p) => '/' + p),
    ];
    for (const recurso of IMPRESCINDIBLES) {
      assert.ok(sw.includes(`'${recurso}'`), `sw.js no precachea ${recurso}`);
    }
  });
});
