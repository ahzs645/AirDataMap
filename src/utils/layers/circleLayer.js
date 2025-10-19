import * as turf from '@turf/turf'

export function updateCircle(map, center, radiusKm, viewMode, boundaryType) {
  if (!map) return

  // Remove existing layers and source if they exist
  if (map.getLayer('search-circle-outline')) {
    map.removeLayer('search-circle-outline')
  }
  if (map.getLayer('search-circle-fill')) {
    map.removeLayer('search-circle-fill')
  }
  if (map.getSource('search-circle')) {
    map.removeSource('search-circle')
  }

  // Only show circle in boundary mode with radius sub-mode
  if (viewMode !== 'boundary' || boundaryType !== 'radius') {
    return
  }

  const circleFeature = turf.circle([center.lon, center.lat], radiusKm, {
    steps: 64,
    units: 'kilometers'
  })

  // Add fresh source and layers
  map.addSource('search-circle', {
    type: 'geojson',
    data: circleFeature
  })

  map.addLayer({
    id: 'search-circle-fill',
    type: 'fill',
    source: 'search-circle',
    paint: {
      'fill-color': '#60a5fa',
      'fill-opacity': 0.15
    }
  })

  map.addLayer({
    id: 'search-circle-outline',
    type: 'line',
    source: 'search-circle',
    paint: {
      'line-color': '#2563eb',
      'line-width': 1.5
    }
  })
}
