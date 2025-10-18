<template>
  <div class="relative h-full w-full">
    <div ref="mapRef" class="h-full w-full"></div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { cellToBoundary } from 'h3-js'
import * as turf from '@turf/turf'
const props = defineProps({
  center: {
    type: Object,
    required: true
  },
  radiusKm: {
    type: Number,
    required: true
  },
  points: {
    type: Array,
    default: () => []
  },
  satelliteProducts: {
    type: Array,
    default: () => []
  },
  hexProducts: {
    type: Array,
    default: () => []
  },
  summary: {
    type: Object,
    required: true
  },
  centerSelectionEnabled: {
    type: Boolean,
    default: false
  },
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:center'])

const mapRef = ref(null)
let map = null
let pendingStyleRefresh = null
let radiusUpdateTimeout = null
let layerUpdateScheduled = false
let pendingLayerForce = false

// Free vector map styles - no API keys needed!
const BASE_STYLE_ID = 'osm-bright'
const mapStyles = [
  {
    id: BASE_STYLE_ID,
    lightUrl: 'https://tiles.openfreemap.org/styles/bright',
    darkUrl: 'https://tiles.openfreemap.org/styles/dark'
  }
]

function getStyleUrl(styleId = BASE_STYLE_ID) {
  const style = mapStyles.find(s => s.id === styleId) ?? mapStyles[0]
  if (!style) return 'https://tiles.openfreemap.org/styles/bright'
  return props.isDarkMode ? style.darkUrl : style.lightUrl
}

function setBaseCursor() {
  if (!map) return
  map.getCanvas().style.cursor = props.centerSelectionEnabled ? 'crosshair' : ''
}

function buildPopupContent(feature) {
  const props = feature.properties || feature
  const lines = [`<strong>${props.name ?? props.id}</strong>`]
  if (props.network) {
    lines.push(`<div><small>${props.network}</small></div>`)
  }

  const parameterValues = Array.isArray(props.parameters)
    ? props.parameters
    : typeof props.parameters === 'string'
      ? props.parameters
          .split(/[|,]/)
          .map(param => param.trim())
          .filter(Boolean)
      : []

  if (parameterValues.length) {
    lines.push(`<div>${parameterValues.join(', ')}</div>`)
  }
  const statusValue = typeof props.status === 'string' ? props.status.trim().toLowerCase() : ''
  if (statusValue && !['active', 'yes', 'true', '1'].includes(statusValue)) {
    const label = statusValue === 'inactive' ? 'Inactive' : props.status
    lines.push(`<div>Status: ${label}</div>`)
  }
  if (props.globalCoverage || props.coverage === 'global') {
    lines.push('<div>Coverage: Global</div>')
  }
  if (props.temporal) {
    lines.push(`<div>Coverage: ${props.temporal}</div>`)
  }
  if (props.frequency) {
    lines.push(`<div>Frequency: ${props.frequency}</div>`)
  }
  if (props.siteType) {
    lines.push(`<div>Site Type: ${props.siteType}</div>`)
  }
  if (props.instrumentMentor) {
    lines.push(`<div>Mentor: ${props.instrumentMentor}</div>`)
  }
  if (props.comments) {
    lines.push(`<div>${props.comments}</div>`)
  }
  return lines.join('')
}

function updateCircle() {
  if (!map) return

  console.log('updateCircle called')

  const circleFeature = turf.circle([props.center.lon, props.center.lat], props.radiusKm, {
    steps: 64,
    units: 'kilometers'
  })

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

function updatePoints() {
  if (!map) return

  console.log('updatePoints called with', props.points.length, 'points')

  // Filter out any points with invalid coordinates and create features
  const features = props.points
    .filter(point => {
      const isValid = typeof point.longitude === 'number' &&
                     typeof point.latitude === 'number' &&
                     !isNaN(point.longitude) &&
                     !isNaN(point.latitude) &&
                     point.longitude >= -180 &&
                     point.longitude <= 180 &&
                     point.latitude >= -90 &&
                     point.latitude <= 90

      if (!isValid) {
        console.warn('Skipping point with invalid coordinates:', point)
      }
      return isValid
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

  console.log('GeoJSON features:', features.length, 'from', props.points.length, 'points')

  // Remove existing layers and source if they exist
  if (map.getLayer('points-layer')) {
    map.removeLayer('points-layer')
  }
  if (map.getLayer('points-glow')) {
    map.removeLayer('points-glow')
  }
  if (map.getSource('points')) {
    map.removeSource('points')
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
          'PA', '#a855f7',
          'FEM', '#22c55e',
          'EGG', '#3b82f6',
          'SPARTAN', '#f59e0b',
          'ASCENT', '#0ea5e9',
          'EPA IMPROVE', '#14b8a6',
          'EPA NATTS', '#f97316',
          'EPA NCORE', '#6366f1',
          'EPA CSN STN', '#8b5cf6',
          'EPA NEAR ROAD', '#facc15',
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
      // Use data-driven styling based on network type
      'circle-color': [
        'case',
        ['==', ['downcase', ['coalesce', ['get', 'status'], 'active']], 'inactive'],
        '#ef4444',
        [
          'match',
          ['get', 'network'],
          'PA', '#a855f7',                        // Purple for Purple Air
          'FEM', '#22c55e',                      // Green for FEM
          'EGG', '#3b82f6',                      // Blue for AQ Egg
          'SPARTAN', '#f59e0b',                  // Amber/Orange for SPARTAN
          'ASCENT', '#0ea5e9',                   // Cyan for ASCENT
          'EPA IMPROVE', '#14b8a6',              // Teal for IMPROVE
          'EPA NATTS', '#f97316',                // Orange for NATTS
          'EPA NCORE', '#6366f1',                // Indigo for NCore
          'EPA CSN STN', '#8b5cf6',              // Purple for CSN speciation
          'EPA NEAR ROAD', '#facc15',            // Yellow for near-road monitors
          '#9ca3af'                              // Gray fallback
        ]
      ],
      'circle-stroke-color': '#ffffff',  // White stroke for contrast in both modes
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

    const description = uniqueFeatures
      .map((feature) => `<div class="space-y-1">${buildPopupContent(feature)}</div>`)
      .join('<hr class="my-2 border-muted/40" />')

    const popupContent = `<div class="space-y-2">${description}</div>`

    new maplibregl.Popup()
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

function updateSatellite() {
  if (!map) return

  const features = props.satelliteProducts.map(product => ({
    type: 'Feature',
    geometry: product.geometry,
    properties: product
  }))

  const geojson = {
    type: 'FeatureCollection',
    features
  }

  // Remove existing layers and source if they exist
  if (map.getLayer('satellite-outline')) {
    map.removeLayer('satellite-outline')
  }
  if (map.getLayer('satellite-layer')) {
    map.removeLayer('satellite-layer')
  }
  if (map.getSource('satellite')) {
    map.removeSource('satellite')
  }

  // Add fresh source and layers
  map.addSource('satellite', {
    type: 'geojson',
    data: geojson
  })

  map.addLayer({
    id: 'satellite-layer',
    type: 'fill',
    source: 'satellite',
    paint: {
      'fill-color': '#fb923c',
      'fill-opacity': 0.1
    }
  })

  map.addLayer({
    id: 'satellite-outline',
    type: 'line',
    source: 'satellite',
    paint: {
      'line-color': '#f97316',
      'line-width': 1.5
    }
  })

  // Add click handler for popups
  map.on('click', 'satellite-layer', (e) => {
    const description = buildPopupContent(e.features[0])
    new maplibregl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(description)
      .addTo(map)
  })

  map.on('mouseenter', 'satellite-layer', () => {
    map.getCanvas().style.cursor = 'pointer'
  })

  map.on('mouseleave', 'satellite-layer', () => {
    setBaseCursor()
  })
}

function updateHex() {
  if (!map) return

  const features = []

  props.hexProducts.forEach(product => {
    // Add product geometry if it exists
    if ((product.globalCoverage || product.geometryIntersects) && product.geometry) {
      features.push({
        type: 'Feature',
        geometry: product.geometry,
        properties: product
      })
    }

    // Add individual H3 cells
    product.cellsWithin?.forEach(cell => {
      const boundary = cellToBoundary(cell, true)
      const coordinates = boundary.map(([lat, lon]) => [lon, lat])
      // Close the polygon
      coordinates.push(coordinates[0])

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates]
        },
        properties: product
      })
    })
  })

  const geojson = {
    type: 'FeatureCollection',
    features
  }

  // Remove existing layers and source if they exist
  if (map.getLayer('hex-grids-outline')) {
    map.removeLayer('hex-grids-outline')
  }
  if (map.getLayer('hex-grids-layer')) {
    map.removeLayer('hex-grids-layer')
  }
  if (map.getSource('hex-grids')) {
    map.removeSource('hex-grids')
  }

  // Add fresh source and layers
  map.addSource('hex-grids', {
    type: 'geojson',
    data: geojson
  })

  map.addLayer({
    id: 'hex-grids-layer',
    type: 'fill',
    source: 'hex-grids',
    paint: {
      'fill-color': '#a855f7',
      'fill-opacity': 0.2
    }
  })

  map.addLayer({
    id: 'hex-grids-outline',
    type: 'line',
    source: 'hex-grids',
    paint: {
      'line-color': '#7c3aed',
      'line-width': 1
    }
  })

  // Add click handler for popups
  map.on('click', 'hex-grids-layer', (e) => {
    const description = buildPopupContent(e.features[0])
    new maplibregl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(description)
      .addTo(map)
  })

  map.on('mouseenter', 'hex-grids-layer', () => {
    map.getCanvas().style.cursor = 'pointer'
  })

  map.on('mouseleave', 'hex-grids-layer', () => {
    setBaseCursor()
  })
}

function updateAllLayers({ force = false } = {}) {
  if (!map) {
    console.log('updateAllLayers: map not initialized')
    return
  }

  console.log('updateAllLayers called, force:', force, 'styleLoaded:', map.isStyleLoaded())

  if (!map.isStyleLoaded()) {
    if (!pendingStyleRefresh) {
      console.log('Style not loaded, waiting...')
      pendingStyleRefresh = () => {
        if (!map || !map.isStyleLoaded()) return
        map.off('styledata', pendingStyleRefresh)
        pendingStyleRefresh = null
        console.log('Style loaded via pending refresh, updating all layers')
        scheduleLayerUpdate({ force: true })
      }
      map.on('styledata', pendingStyleRefresh)
    }
    return
  }

  if (pendingStyleRefresh) {
    map.off('styledata', pendingStyleRefresh)
    pendingStyleRefresh = null
  }

  console.log('Updating all layers now...')
  updateCircle()
  updatePoints()
  updateSatellite()
  updateHex()
}

function scheduleLayerUpdate({ force = false } = {}) {
  pendingLayerForce = pendingLayerForce || force
  if (layerUpdateScheduled) return
  layerUpdateScheduled = true
  requestAnimationFrame(() => {
    layerUpdateScheduled = false
    const forceUpdate = pendingLayerForce
    pendingLayerForce = false
    updateAllLayers({ force: forceUpdate })
  })
}

function zoomToPoint(lat, lon) {
  if (!map) return
  map.flyTo({
    center: [lon, lat],
    zoom: 14,
    essential: true
  })
}

function switchMapStyle(styleId = BASE_STYLE_ID) {
  if (!map || !styleId) return

  const currentView = {
    center: map.getCenter(),
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch()
  }

  const styleUrl = getStyleUrl(styleId)
  map.setStyle(styleUrl)

  map.once('style.load', () => {
    map.jumpTo({
      center: [currentView.center.lng, currentView.center.lat],
      zoom: currentView.zoom,
      bearing: currentView.bearing,
      pitch: currentView.pitch
    })

    updateAllLayers({ force: true })
    setBaseCursor()
  })
}

defineExpose({
  zoomToPoint
})

onMounted(() => {
  map = new maplibregl.Map({
    container: mapRef.value,
    style: getStyleUrl(),
    center: [props.center.lon, props.center.lat],
    zoom: 10
  })

  // Add navigation controls
  map.addControl(new maplibregl.NavigationControl(), 'top-right')
  setBaseCursor()

  // Handle map clicks to update center
  map.on('click', (e) => {
    if (!props.centerSelectionEnabled) return

    // Don't emit if clicking on a feature
    const features = map.queryRenderedFeatures(e.point, {
      layers: ['points-layer', 'satellite-layer', 'hex-grids-layer']
    })

    if (features.length === 0) {
      emit('update:center', { lat: e.lngLat.lat, lon: e.lngLat.lng })
    }
  })

  // Wait for style to load before adding layers
  map.on('load', () => {
    setBaseCursor()
    scheduleLayerUpdate({ force: true })
  })
})

onBeforeUnmount(() => {
  if (map && pendingStyleRefresh) {
    map.off('styledata', pendingStyleRefresh)
  }
  map?.remove()
  map = null
  pendingStyleRefresh = null
  if (radiusUpdateTimeout) {
    clearTimeout(radiusUpdateTimeout)
    radiusUpdateTimeout = null
  }
})

watch(
  () => ({ ...props.center }),
  (center) => {
    if (!map) return
    map.setCenter([center.lon, center.lat])
    scheduleLayerUpdate()
  }
)

watch(
  () => props.radiusKm,
  () => {
    if (radiusUpdateTimeout) {
      clearTimeout(radiusUpdateTimeout)
    }
    radiusUpdateTimeout = setTimeout(() => {
      radiusUpdateTimeout = null
      scheduleLayerUpdate({ force: true })
    }, 150)
  }
)

watch(
  () => props.points,
  () => {
    scheduleLayerUpdate()
  },
  { deep: true }
)

watch(
  () => props.satelliteProducts,
  () => {
    scheduleLayerUpdate()
  },
  { deep: true }
)

watch(
  () => props.hexProducts,
  () => {
    scheduleLayerUpdate()
  },
  { deep: true }
)

watch(
  () => props.centerSelectionEnabled,
  () => {
    setBaseCursor()
  }
)

watch(
  () => props.isDarkMode,
  () => {
    // Re-apply the current style with the new dark mode setting
    switchMapStyle()
  }
)
</script>
