import { reactive, computed } from 'vue'

export function useVisibleItems(satelliteMatchesRef, hexMatchesRef) {
  // Track which items are visible on the map
  const visibleItems = reactive({
    satellites: new Set(),
    hexProducts: new Set()
  })

  function toggleSatelliteVisibility(productId) {
    if (visibleItems.satellites.has(productId)) {
      visibleItems.satellites.delete(productId)
    } else {
      visibleItems.satellites.add(productId)
    }
  }

  function toggleHexVisibility(productId) {
    if (visibleItems.hexProducts.has(productId)) {
      visibleItems.hexProducts.delete(productId)
    } else {
      visibleItems.hexProducts.add(productId)
    }
  }

  // Filter satellite and hex products to only show visible ones on map
  const visibleSatelliteProducts = computed(() => {
    return satelliteMatchesRef.value.filter(p => visibleItems.satellites.has(p.id))
  })

  const visibleHexProducts = computed(() => {
    return hexMatchesRef.value.filter(p => visibleItems.hexProducts.has(p.id))
  })

  return {
    visibleItems,
    toggleSatelliteVisibility,
    toggleHexVisibility,
    visibleSatelliteProducts,
    visibleHexProducts
  }
}
