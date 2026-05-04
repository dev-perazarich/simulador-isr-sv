// js/app-salario.js
import { useSalarioTab }       from './composables/useSalarioTab.js';
import { useShared }           from './composables/useShared.js';
import { useTheme }            from './composables/useTheme.js';
import PDFService              from './services/PDFService.js';
import { DATA_APP }           from './modules/constants.js';

const { createApp, onMounted } = Vue;

createApp({
  setup() {
    const shared         = useShared();
    const salarioTab     = useSalarioTab();
    const { theme, isDarkMode, toggleTheme } = useTheme();
    const pdfService     = new PDFService();

    function generarPDF() {
      if (salarioTab.resultadoSalario.value) {
        pdfService.generarPDFSalario(salarioTab.resultadoSalario.value);
      }
    }

    onMounted(() => {
      salarioTab.restaurarDatos();
    });

    return {
      ...shared,
      ...salarioTab,
      theme, isDarkMode, toggleTheme,
      generarPDF,
      DATA_APP,
    };
  },
}).mount('#app-salario');
