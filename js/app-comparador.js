// js/app-comparador.js
import { useComparadorTab }    from './composables/useComparadorTab.js';
import { useShared }           from './composables/useShared.js';
import { useTheme }            from './composables/useTheme.js';
import { DATA_2026 }           from './modules/constants.js';

const { createApp, onMounted } = Vue;

createApp({
  setup() {
    const shared         = useShared();
    const compTab        = useComparadorTab();
    const { theme, isDarkMode, toggleTheme } = useTheme();

    onMounted(() => {
      compTab.restaurarDatos();
    });

    return {
      ...shared,
      ...compTab,
      theme, isDarkMode, toggleTheme,
      DATA_2026,
    };
  },
}).mount('#app-comparador');