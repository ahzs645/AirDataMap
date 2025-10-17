import { ref, watch, onMounted } from 'vue'

export function useDarkMode() {
  const isDark = ref(false)

  // Initialize dark mode from localStorage or system preference
  onMounted(() => {
    const stored = localStorage.getItem('darkMode')
    if (stored !== null) {
      isDark.value = stored === 'true'
    } else {
      // Check system preference
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    updateDarkMode()
  })

  // Watch for changes and update the DOM
  watch(isDark, () => {
    updateDarkMode()
    localStorage.setItem('darkMode', isDark.value.toString())
  })

  function updateDarkMode() {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function toggleDarkMode() {
    isDark.value = !isDark.value
  }

  return {
    isDark,
    toggleDarkMode
  }
}
