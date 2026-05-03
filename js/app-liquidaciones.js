import { useLiquidacionesTab } from './composables/useLiquidacionesTab.js';
import { useShared }           from './composables/useShared.js';
import { useTheme }            from './composables/useTheme.js';
import PDFService              from './services/PDFService.js';
import { DATA_2026 }           from './modules/constants.js';

const { createApp, onMounted } = Vue;

createApp({
  setup() {
    const shared         = useShared();
    const liqTab         = useLiquidacionesTab();
    const { theme, isDarkMode, toggleTheme } = useTheme();
    const pdfService     = new PDFService();

    function generarPDF() {
      alert("La exportación a PDF para la suite extendida de liquidación estará disponible en la próxima versión.");
    }

    onMounted(() => {
      liqTab.restaurarDatos();
    });

    return {
      ...shared,
      ...liqTab,
      theme, isDarkMode, toggleTheme,
      generarPDF,
      DATA_2026,
    };
  },
}).mount('#app-liquidaciones');
