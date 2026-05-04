# Salvadoran Labor & Tax Toolbox 2026 (PWA)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Made with Vue](https://img.shields.io/badge/Made%20with-Vue-35495E)](https://vuejs.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Yes-brightgreen)](https://web.dev/progressive-web-apps/)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/dev-perazarich/simulador-isr-sv/graphs/commit-activity)

## 📌 Visión General

Este proyecto es una **Progressive Web App (PWA)** diseñada para democratizar el acceso a cálculos financieros laborales en El Salvador. El objetivo principal es proporcionar una herramienta **gratuita, precisa y 100% privada** que permita a los ciudadanos simular su declaración de Renta 2025/2026, calcular su salario neto según sector y estimar indemnizaciones/aguinaldos sin depender de gestores costosos.

### 🛡️ Filosofía de Privacidad (Zero-Server Architecture)

- **Sin base de datos:** No se almacena información en servidores.
- **Session Storage:** Los datos se procesan en el navegador y se eliminan automáticamente al cerrar la pestaña o el navegador.
- **Client-Side Processing:** Todo el cálculo matemático ocurre en el dispositivo del usuario.

## 🛠 Stack Tecnológico (No-Build Approach)

Para garantizar agilidad y facilidad de despliegue en Vercel/GitHub:

- **Frontend:** HTML5, Tailwind CSS (CDN).
- **Reactividad:** Vue.js 3 (Composition API via CDN).
- **Persistencia Temporal:** JavaScript `sessionStorage`.
- **Generación de Reportes:** `jsPDF` (para descargar borradores F-11).
- **Offline:** Service Workers (Estrategia: Cache First).

## 📂 Estructura de Archivos (Arquitectura Modular)

El sistema sigue esta estructura estricta de responsabilidades:

```text
simulador-isr/
├── index.html              # UI Shell, navegación y contenedores Vue
├─manifest.json           # Configuración PWA e iconos
├── sw.js                   # Service Worker para funcionamiento offline
├── css/
│   └── app.css             # Estilos personalizados
└── js/
    ├── main.js             # Inicialización de Vue, Router y lógica de UI
    └── modules/
        ├── constants.js    # La "Biblia" de datos: Tablas ISR, salarios y techos
        ├── calculator.js   # Algoritmos puros (Funciones exportables)
        └── storage.js      # Helpers para manejo de sessionStorage
```

## ⚖️ Reglas de Negocio y Lógica Fiscal (Parámetros 2025-2026)

### A. Impuesto sobre la Renta (ISR) - Reforma Art. 37
La base exenta mensual es de **$550.00**. Los tramos de retención mensual vigentes son:

| Tramo | Renta Neta Imponible (Desde - Hasta) | % Aplicable | Sobre el Exceso de | Cuota Fija |
| :--- | :--- | :--- | :--- | :--- |
| I | $0.01 a $550.00 | Exento | $0.00 | $0.00 |
| II | $550.01 a $895.24 | 10% | $550.00 | $17.67 |
| III | $895.25 a $2,038.10 | 20% | $895.24 | $60.00 |
| IV | $2,038.11 en adelante | 30% | $2,038.10 | $288.57 |

### B. Descuentos de Ley (Techos Máximos)
- **ISSS (Salud):** 3% del salario bruto. **Tope máximo: $30.00** (sobre base de $1,000.00).
- **AFP (Pensiones):** 7.25% del salario bruto. **Tope máximo: $581.21** (sobre base de $8,016.71).

### C. Salarios Mínimos (Vigentes desde Junio 2025)
- **Comercio, Industria y Servicios:** $408.80 (Diario: $13.44).
- **Maquila Textil y Confección:** $402.32 (Diario: $13.227).
- **Sector Agrícola:** $305.23 (Diario: $10.035).

### D. Aguinaldo (Decreto Legislativo No. 432)
- **Exención:** Los aguinaldos están exentos de ISR hasta un límite de **$1,500.00**. Solo el excedente se suma a la renta gravada.
- **Días de pago según antigüedad:**
  - 1 a 3 años: 15 días.
  - 3 a 10 años: 19 días.
  - 10+ años: 21 días.

### E. Indemnización (Art. 58 Código de Trabajo)
- **Fórmula:** 30 días de salario básico por cada año laborado (proporcional por meses/días).
- **Tope Salarial de Referencia:** El salario diario para el cálculo no puede exceder 4 salarios mínimos mensuales del sector comercio ($408.80 * 4 = **$1,635.20**).

## 🚀 Instrucciones para la Programación por IA (Prompts Maestro)

### Paso 1: Inicializar Datos (constants.js)
Define un objeto `DATA_2026` que exporte todas las tablas mencionadas arriba. Asegúrate de incluir los tramos del recálculo de Junio y Diciembre.

### Paso 2: Desarrollar Lógica Matemática (calculator.js)
Crea funciones puras que reciban `salarioBruto` y retornen un objeto con el desglose:
- `calculateNetSalary()`: Debe restar ISSS/AFP (con techos) y luego aplicar la tabla de ISR.
- `calculateSeverance()`: Debe manejar el tope de 4 salarios mínimos.
- `simulateAnnualISR()`: Debe permitir el ingreso mes a mes y consolidar ingresos de servicios profesionales (retención 10%) para prever el saldo de abril 2026.

### Paso 3: Interfaz de Usuario (index.html + main.js)
- Implementa una arquitectura de pestañas (Tabs): [Salario Neto], [Aguinaldo/Indemnización], [Simulador F-11], [Comparador Planilla vs Freelance].
- Usa componentes de Tailwind para tarjetas de resultados dinámicas.
- Agrega un botón de "Generar PDF" que mapee los resultados del simulador a una visualización similar al formulario F-11 del Ministerio de Hacienda.

## ☕ Modelo de Sostenibilidad

El sitio es y será gratuito. Se incluye un botón de **"Invítame a un café"** (via Buy Me a Coffee) aclarando que las donaciones ayudan a mantener actualizados los parámetros según los decretos de la Asamblea Legislativa.

## 🤝 Contribuyendo

¡Gracias por considerar contribuir a este proyecto! Para garantizar un proceso fluido:

1. **Fork** el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. Abre un **Pull Request**

### Guía de Estilo
- Mantener la arquitectura modular existente
- Usar Vue 3 Composition API
- Seguir las convenciones de Tailwind ya establecidas
- Documentar funciones complejas con JSDoc
- Mantener la filosofía Zero-Server

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Soporte

Si tienes preguntas o necesitas ayuda, por favor abre un [issue](https://github.com/dev-perazarich/simulador-isr-sv/issues).

---

**Nota Legal:** Esta herramienta es un simulador con fines informativos y no sustituye la asesoría profesional ni el dictamen oficial del Ministerio de Hacienda de El Salvador.

Hecho con 🇸🇻 por [dev-perazarich](https://github.com/dev-perazarich)