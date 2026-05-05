// js/app-isranual.js
import { useDeclaracionTab }   from './composables/useDeclaracionTab.js';
import { useShared }           from './composables/useShared.js';
import { useTheme }            from './composables/useTheme.js';
import PDFService              from './services/PDFService.js';
import { DATA_2026 }           from './modules/constants.js';

const { createApp, onMounted } = Vue;

createApp({
  setup() {
    const shared         = useShared();
    const declaracionTab = useDeclaracionTab();
    const { theme, isDarkMode, toggleTheme } = useTheme();
    const pdfService     = new PDFService();

    function generarPDF() {
      if (declaracionTab.resultadoAnual.value) {
        pdfService.generarPDFDeclaracion(declaracionTab.resultadoAnual.value);
      }
    }

    onMounted(() => {
      declaracionTab.restaurarDatos();
    });

    return {
      ...shared,
      ...declaracionTab,
      theme, isDarkMode, toggleTheme,
      generarPDF,
      DATA_2026,
    };
  },
}).mount('#app-isranual');