import { ref } from 'vue'

export function useGeocoding(centerRef) {
  const searchQuery = ref('')
  const searching = ref(false)
  const searchError = ref(null)

  async function searchAddress() {
    if (!searchQuery.value.trim()) return

    searching.value = true
    searchError.value = null

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          new URLSearchParams({
            q: searchQuery.value,
            format: 'json',
            limit: '1'
          })
      )

      const results = await response.json()

      if (results.length === 0) {
        searchError.value = 'No results found. Try a different search term.'
        return
      }

      const result = results[0]
      centerRef.value = {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon)
      }

      return true // Indicates success
    } catch (err) {
      searchError.value = 'Failed to search address. Please try again.'
      return false
    } finally {
      searching.value = false
    }
  }

  function clearError() {
    searchError.value = null
  }

  return {
    searchQuery,
    searching,
    searchError,
    searchAddress,
    clearError
  }
}
