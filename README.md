# RentaSV — Calculadora laboral y fiscal de El Salvador

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Sin compilación](https://img.shields.io/badge/build-ninguno-brightgreen)](#c%C3%B3mo-se-trabaja)
[![Vue 3](https://img.shields.io/badge/Vue-3-35495E)](https://vuejs.org/)
[![PWA](https://img.shields.io/badge/PWA-instalable-brightgreen)](https://web.dev/progressive-web-apps/)
[![Tests](https://img.shields.io/badge/tests-101%20pasando-success)](#pruebas)

Aplicación web para calcular salario neto, prestaciones laborales y declaración de renta
en El Salvador con las tablas oficiales vigentes. **Gratuita, sin registro, sin servidores
y sin paso de compilación.**

🔗 <https://simulador-isr-sv.vercel.app>

---

## Qué incluye

| Herramienta | Qué resuelve | Base legal |
| :--- | :--- | :--- |
| **Salario neto** | Bruto → líquido con ISSS, AFP e ISR, en mensual, quincenal o semanal. Horas extras y costo patronal. | Art. 37 LISR · Arts. 168-170 CT |
| **Prestaciones y liquidación** | Indemnización, renuncia voluntaria, aguinaldo y vacación. | Arts. 58, 177, 196-202 CT · D.L. 592/2013 |
| **Declaración anual F-11** | Simulación mes a mes, deducción fija y recálculos de junio y diciembre. | Arts. 29, 33 y 38 LISR |
| **Planilla vs. honorarios** | Comparación con el valor real de las prestaciones perdidas. | Art. 156 Código Tributario |
| **Guía de usuario** | Cada concepto explicado en lenguaje llano, con su amparo legal. | — |

---

## Cómo se trabaja

**No hay compilación. No hay bundler. No hay npm que ejecutar para que el sitio
funcione.** Se abre el archivo, se edita, se recarga el navegador.

| Quiero cambiar… | Edito… |
| :--- | :--- |
| El contenido de una página | El `.html` correspondiente, directamente |
| Un estilo o un componente | `css/app.css`, directamente |
| Una tabla, un tope o una tasa | `js/modules/constants.js` |
| Una fórmula | `js/modules/calculator.js` |

Para verlo en local basta cualquier servidor estático (hace falta uno porque los módulos
de JavaScript no cargan desde `file://`):

```bash
npm run serve      # http://localhost:4173
# o, sin npm:  python -m http.server 4173
```

Para desplegar: subir la carpeta. Vercel, Netlify, GitHub Pages o cualquier hosting
estático la sirven tal cual, sin ejecutar nada.

### Dos cosas que conviene tener presentes

1. **El encabezado, el menú y el pie están repetidos en las 10 páginas.** Es el precio de
   no tener un generador. Si cambia un enlace del menú, hay que cambiarlo en las 10.
2. **Las cifras impresas en la portada y en la guía son texto fijo.** Pueden quedarse
   atrás cuando se actualice `constants.js`. Para eso existe
   [`tests/parametros.test.js`](tests/parametros.test.js): compara lo publicado contra los
   parámetros reales y falla indicando exactamente qué número quedó viejo. **Corra
   `npm test` después de tocar cualquier parámetro.**

---

## Arquitectura

```text
simulador-isr-sv/
├── index.html              # portada (armazón de landing)
├── guia.html               # guía de usuario
├── salario.html            # ─┐
├── liquidaciones.html      #  │ calculadoras
├── isr-anual.html          #  │ (armazón de panel)
├── comparador.html         # ─┘
├── autor.html
├── donaciones.html
├── legal/                  # privacidad y términos
├── css/app.css             # tokens, base y componentes — se edita a mano
├── js/
│   ├── modules/
│   │   ├── constants.js    # TODOS los parámetros legales, con su cita
│   │   ├── calculator.js   # algoritmos puros (sin DOM, probables desde Node)
│   │   └── storage.js      # sessionStorage
│   ├── composables/        # estado de cada calculadora (Vue 3)
│   ├── services/           # exportación a PDF
│   ├── shell.js            # menús y tema (vanilla, sin Vue)
│   └── app-*.js            # entrada de cada calculadora
├── vendor/                 # librerías servidas desde el propio dominio
│   ├── tailwind.js         #   compilador de utilidades (en el navegador)
│   ├── vue.global.prod.js
│   └── jspdf.umd.min.js
├── icons/                  # PNG de la PWA
├── tests/                  # pruebas de la lógica fiscal y de sincronía
└── scripts/                # utilidades opcionales, nada de esto corre en producción
```

### Cómo se reparten los estilos

- **`css/app.css`** tiene los tokens, la base y todas las clases de componente
  (`.card`, `.btn`, `.form-input`, `.table`, `.sidebar`…). Es CSS plano y se edita a mano.
- **`vendor/tailwind.js`** resuelve en el navegador las clases utilitarias del marcado
  (`grid`, `gap-5`, `lg:grid-cols-2`, `text-sm`…). Va acompañado de su configuración en
  línea en cada página, donde viven la paleta `brand`/`ink` y el modo oscuro.

La cascada está pensada así: `app.css` se enlaza en el `<head>` y Tailwind inyecta lo
suyo después, de modo que una utilidad del HTML siempre puede ajustar un componente.
Y como `app.css` es una hoja real, la página ya se ve estructurada antes de que el
compilador termine.

### Otras decisiones

- **Ningún CDN de terceros en tiempo de ejecución.** Todo se sirve desde el propio
  dominio; solo quedan las tipografías de Google Fonts, que degradan a la fuente del
  sistema. Hay una prueba que falla si alguien vuelve a meter un CDN.
- **El Service Worker usa red primero para HTML, CSS y JS.** Si la Asamblea reforma una
  tabla, nadie debe quedarse con cifras viejas por tener el sitio en caché.
- **`calculator.js` no toca el DOM**, así que se prueba desde Node y se puede reutilizar.
- **Modo claro por omisión.** El oscuro es una elección explícita, no la preferencia del
  sistema: en una herramienta de dinero el modo claro es el que transmite confianza.

---

## Parámetros fiscales

Todos viven en [`js/modules/constants.js`](js/modules/constants.js), cada uno con su
`fuente` y su fecha de revisión. **Ese es el único archivo que hay que tocar cuando
cambia un decreto** (y luego `npm test`, que le dirá si alguna página quedó desfasada).

Vigentes al momento de la última revisión:

- **ISR** — base exenta de $550.00 mensuales ($6,600.00 anuales). Art. 37 LISR reformado
  por el D.L. 293 del 30/04/2025 (D.O. N° 79, T. 447). Las cinco tablas (mensual,
  quincenal, semanal y los dos recálculos) se transcribieron del **Decreto Ejecutivo
  No. 10 (abril 2025)**.
- **ISSS** — 3% laboral con tope de $30.00; 7.5% patronal con tope de $75.00.
- **AFP** — 7.25% laboral con tope de $581.21; 8.75% patronal.
- **Salarios mínimos** — vigentes desde junio 2025: comercio $408.80, maquila $402.32,
  agropecuario $305.23.
- **Aguinaldo** — exento de ISR hasta $1,500.00 (D.L. 596).
- **Indemnización** — 30 días por año, mínimo 15, tope de 4 salarios mínimos **diarios**
  ($53.76/día). Exenta de ISR.
- **Deducción fija** — $1,600 anuales para asalariados con renta ≤ $9,100 (Art. 29
  numeral 7 inciso primero). El decreto de las tablas advierte que la retención **no** la
  incorpora y que el patrono debe considerarla: de ahí sale buena parte de los saldos a
  favor de abril.

> **Nota sobre la tabla oficial:** entre el tramo II y el III existe un salto de $7.81
> (con base $895.24 se retienen $52.19; con $895.25, $60.00). La reforma subió la base
> exenta y conservó las cuotas fijas anteriores. Se reproduce tal cual porque así se
> retiene en planilla, y la calculadora avisa cuando el usuario queda cerca de ese borde.

---

## Pruebas

```bash
npm test     # no requiere instalar nada: usa el runner de Node
```

**101 pruebas**, en dos frentes:

- **`calculator.test.js`** — los bordes exactos de cada tramo de las cinco tablas, los
  topes de cotización, la proporcionalidad de las prestaciones, el ISR del aguinaldo y
  las regresiones ya corregidas. Incluye un barrido de todos los salarios de $400 a
  $10,000 en pasos de un centavo, y una comprobación de que la retención nunca decrece
  al subir el salario.
- **`parametros.test.js`** — la red contra la deriva: verifica que las cifras publicadas
  en la portada y en la guía coincidan con `constants.js`, que ninguna página dependa de
  un CDN externo y que el Service Worker precachee todo lo necesario.

### Auditoría visual (opcional)

```bash
npm install            # solo para esto: instala playwright-core
npm run audit:visual
```

Abre las páginas en Edge a 390 px y 1440 px, rellena los formularios, y falla si detecta
scroll horizontal, errores de consola o utilidades de Tailwind sin resolver.

### Utilidades de mantenimiento (opcionales)

```bash
npm run vendor   # baja Vue, jsPDF y Tailwind a /vendor (versiones fijadas)
npm run icons    # regenera los PNG de la PWA desde la marca
```

Ninguna de las dos hace falta para trabajar ni para desplegar.

---

## Privacidad

Sin servidor, sin base de datos, sin cookies y sin analítica. Los datos se procesan en el
navegador y se guardan en `sessionStorage`, que se vacía al cerrar la pestaña. La única
preferencia persistente es el tema claro/oscuro.

Ver [política de privacidad](legal/privacidad.html) y [términos de uso](legal/terminos.html).

---

## Contribuir

1. Haga un *fork* y cree una rama: `git checkout -b feature/mi-mejora`
2. Si toca la lógica fiscal, **agregue la prueba antes que el cambio**
3. Ejecute `npm test`
4. Abra un *pull request* citando el decreto o artículo que respalda el cambio

### Guía de estilo

- Los parámetros legales van en `constants.js` con su `fuente`, nunca incrustados en el código
- `calculator.js` se mantiene puro: sin DOM, sin Vue, sin efectos secundarios
- Nada de CDNs de terceros: si hace falta una librería, va a `/vendor`
- Nada de pasos de compilación: el sitio debe seguir funcionando abriéndolo tal cual
- Trato de «usted» en toda la interfaz

---

## Licencia

MIT — ver [LICENSE](LICENSE).

---

**Nota legal:** herramienta informativa. No sustituye la asesoría de un contador ni el
dictamen del Ministerio de Hacienda de El Salvador.

Hecho en 🇸🇻 por [dev-perazarich](https://github.com/dev-perazarich)
