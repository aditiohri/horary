import { ref, watch, onMounted } from 'vue';

const isDark = ref(false);

export function useDarkMode() {
  onMounted(() => {
    // Check localStorage or system preference
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) {
      isDark.value = stored === 'true';
    } else {
      // Check system preference
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // Apply initial theme
    applyTheme(isDark.value);
  });

  watch(isDark, (newValue) => {
    localStorage.setItem('darkMode', String(newValue));
    applyTheme(newValue);
  });

  const applyTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleDarkMode = () => {
    isDark.value = !isDark.value;
  };

  return {
    isDark,
    toggleDarkMode,
  };
}
