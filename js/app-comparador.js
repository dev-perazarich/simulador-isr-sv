import { useComparadorTab }    from './composables/useComparadorTab.js';
import { useShared }           from './composables/useShared.js';
import { useTheme }            from './composables/useTheme.js';
import { DATA_APP }         from './modules/constants.js';

Vue.createApp({
  setup() {
    const shared         = useShared();
    const compTab        = useComparadorTab();
    const { theme, isDarkMode, toggleTheme } = useTheme();

    Vue.onMounted(() => {
      compTab.restaurarDatos();
    });

    return {
      ...shared,
      ...compTab,
      theme, isDarkMode, toggleTheme,
      DATA_APP,
    };
  },
}).mount('#app-comparador');
