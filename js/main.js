// js/main.js — Vue app mínima para index.html (landing)
import { useTheme } from './composables/useTheme.js';

const { createApp } = Vue;

createApp({
  setup() {
    const { theme, isDarkMode, toggleTheme } = useTheme();

    function scrollTo(id) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }

    return { theme, isDarkMode, toggleTheme, scrollTo };
  },
}).mount('#app');