import maplibregl from 'maplibre-gl'
import { buildPopupContent } from '../mapPopups.js'

const NETWORK_COLORS = {
  'PA': '#a855f7',
  'FEM': '#22c55e',
  'EGG': '#3b82f6',
  'SPARTAN': '#f59e0b',
  'ASCENT': '#0ea5e9',
  'BC ENV': '#0d9488',
  'EPA IMPROVE': '#14b8a6',
  'EPA NATTS': '#f97316',
  'EPA NCORE': '#6366f1',
  'EPA CSN STN': '#8b5cf6',
  'EPA NEAR ROAD': '#facc15'
}

export function updatePoints(map, points, setBaseCursor) {
  if (!map) return

  // Filter out any points with invalid coordinates and create features
  const features = points
    .filter(point => {
      return typeof point.longitude === 'number' &&
             typeof point.latitude === 'number' &&
             !isNaN(point.longitude) &&
             !isNaN(point.latitude) &&
             point.longitude >= -180 &&
             point.longitude <= 180 &&
             point.latitude >= -90 &&
             point.latitude <= 90
    })
    .map(point => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [point.longitude, point.latitude]
      },
      properties: point
    }))

  const geojson = {
    type: 'FeatureCollection',
    features
  }

  // Update existing source if it exists, otherwise create it
  const existingSource = map.getSource('points')
  if (existingSource) {
    existingSource.setData(geojson)
    return // Early return - layers already exist
  }

  // Add fresh source and layer
  map.addSource('points', {
    type: 'geojson',
    data: geojson
  })

  // Add glow layer first (behind the main points)
  map.addLayer({
    id: 'points-glow',
    type: 'circle',
    source: 'points',
    paint: {
      'circle-radius': 12,
      'circle-color': [
        'case',
        ['==', ['downcase', ['coalesce', ['get', 'status'], 'active']], 'inactive'],
        '#ef4444',
        [
          'match',
          ['get', 'network'],
          ...Object.entries(NETWORK_COLORS).flat(),
          '#9ca3af'
        ]
      ],
      'circle-opacity': 0.3,
      'circle-blur': 1
    }
  })

  // Main points layer
  map.addLayer({
    id: 'points-layer',
    type: 'circle',
    source: 'points',
    paint: {
      'circle-radius': 7,
      'circle-color': [
        'case',
        ['==', ['downcase', ['coalesce', ['get', 'status'], 'active']], 'inactive'],
        '#ef4444',
        [
          'match',
          ['get', 'network'],
          ...Object.entries(NETWORK_COLORS).flat(),
          '#9ca3af'
        ]
      ],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
      'circle-opacity': 1
    }
  })

  // Add click handler for popups
  map.on('click', 'points-layer', (e) => {
    const allFeatures = map
      .queryRenderedFeatures(e.point, { layers: ['points-layer'] })
      .filter(Boolean)

    const uniqueFeatures = []
    const seen = new Set()
    allFeatures.forEach(feature => {
      const props = feature.properties || {}
      const key = props.id ?? `${feature.geometry?.coordinates?.join(':')}`
      if (!seen.has(key)) {
        seen.add(key)
        uniqueFeatures.push(feature)
      }
    })

    const items = uniqueFeatures.map((feature) => {
      const networkColor = NETWORK_COLORS[feature.properties?.network] || '#9ca3af'
      return `<div style="border-left: 2px solid ${networkColor}; padding: 4px 0 4px 8px; margin: 4px 0;">
        ${buildPopupContent(feature)}
      </div>`
    })

    const popupContent = `<div style="padding: 2px;">${items.join('')}</div>`

    new maplibregl.Popup({ closeButton: false })
      .setLngLat(e.lngLat)
      .setHTML(popupContent)
      .addTo(map)
  })

  map.on('mouseenter', 'points-layer', () => {
    map.getCanvas().style.cursor = 'pointer'
  })

  map.on('mouseleave', 'points-layer', () => {
    setBaseCursor()
  })
}
