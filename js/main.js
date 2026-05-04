// js/main.js — Vue app mínima para index.html (landing)
import { useTheme } from './composables/useTheme.js';
import { onMounted } from 'vue';

const { createApp } = Vue;

createApp({
  setup() {
    const { theme, isDarkMode, toggleTheme } = useTheme();

    function scrollTo(id) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }

    onMounted(() => {
      // Hero section animations
      anime.timeline()
        .add({
          targets: '.hero-badge-dot',
          translateY: [50, 0],
          opacity: [0, 1],
          duration: 800,
          easing: 'easeOutExpo'
        })
        .add({
          targets: '.hero-title-grad',
          translateY: [50, 0],
          opacity: [0, 1],
          duration: 800,
          easing: 'easeOutExpo',
          offset: '-=400'
        })
        .add({
          targets: '.hero-section p.text-lg',
          translateY: [50, 0],
          opacity: [0, 1],
          duration: 800,
          easing: 'easeOutExpo',
          offset: '-=600'
        })
        .add({
          targets: '.hero-section .flex.flex-wrap.gap-4.mb-12 a',
          translateY: [50, 0],
          opacity: [0, 1],
          duration: 800,
          easing: 'easeOutExpo',
          offset: '-=400',
          delay: anime.stagger(100)
        })
        .add({
          targets: '.trust-chip',
          translateY: [50, 0],
          opacity: [0, 1],
          duration: 800,
          easing: 'easeOutExpo',
          offset: '-=600',
          delay: anime.stagger(100)
        });

      // Características cards animation
      setTimeout(() => {
        anime.timeline()
          .add({
            targets: '.group',
            translateY: [50, 0],
            opacity: [0, 1],
            duration: 800,
            easing: 'easeOutExpo',
            delay: anime.stagger(100)
          });
      }, 800);
    });

    return { theme, isDarkMode, toggleTheme, scrollTo };
  },
}).mount('#app');