import { useComparadorTab }    from './composables/useComparadorTab.js';
import { useShared }           from './composables/useShared.js';
import { useTheme }            from './composables/useTheme.js';

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
    };
  },
}).mount('#app-comparador');
