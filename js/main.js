// js/main.js — Vue app mínima para index.html (landing)
// Vue is loaded globally from CDN: https://unpkg.com/vue@3/dist/vue.global.prod.js
import { useTheme } from './composables/useTheme.js';
import { useShared } from './composables/useShared.js';

const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    const { theme, isDarkMode, toggleTheme } = useTheme();
    const shared = useShared();

    function scrollTo(id) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }

    onMounted(() => {
      // Initialize AOS (Animate On Scroll Library)
      AOS.init({
        duration: 800,
        easing: 'ease-out-cubic',
        once: false,
        mirror: false
      });

      // Force a refresh of AOS after content loads
      setTimeout(() => {
        AOS.refresh();
      }, 100);
    });

    return { ...shared, theme, isDarkMode, toggleTheme, scrollTo };
  },
}).mount('#app');
