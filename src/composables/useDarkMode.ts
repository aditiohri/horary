import { ref, watch } from 'vue';

const isDark = ref(document.documentElement.classList.contains('dark'));

export function useDarkMode() {
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
