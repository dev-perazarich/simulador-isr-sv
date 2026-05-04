import { useDeclaracionTab }   from './composables/useDeclaracionTab.js';
import { useShared }           from './composables/useShared.js';
import { useTheme }            from './composables/useTheme.js';
import PDFService              from './services/PDFService.js';
import { DATA_APP }           from './modules/constants.js';

Vue.createApp({
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

    Vue.onMounted(() => {
      declaracionTab.restaurarDatos();
    });

    return {
      ...shared,
      ...declaracionTab,
      theme, isDarkMode, toggleTheme,
      generarPDF,
      DATA_APP,
    };
  },
}).mount('#app-isranual');
