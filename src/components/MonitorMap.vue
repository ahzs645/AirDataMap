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
import { cn } from '../lib/utils'

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
  currentStyle: {
    type: String,
    default: 'osm-bright'
  }
})

const emit = defineEmits(['update:center'])

const mapRef = ref(null)
let map = null

// Free vector map styles - no API keys needed!
const mapStyles = [
  {
    id: 'osm-bright',
    name: 'Street',
    url: 'https://tiles.openfreemap.org/styles/bright'
  },
  {
    id: 'osm-liberty',
    name: 'Classic',
    url: 'https://tiles.openfreemap.org/styles/liberty'
  },
  {
    id: 'satellite',
    name: 'Satellite',
    // Raster satellite overlay on vector base
    url: 'https://tiles.openfreemap.org/styles/bright' // We'll add satellite layer on top
  }
]

function buildPopupContent(feature) {
  const props = feature.properties || feature
  const lines = [`<strong>${props.name ?? props.id}</strong>`]
  if (props.network) {
    lines.push(`<div><small>${props.network}</small></div>`)
  }
  if (props.parameters?.length) {
    lines.push(`<div>${props.parameters.join(', ')}</div>`)
  }
  if (props.status) {
    lines.push(`<div>Status: ${props.status}</div>`)
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
  return lines.join('')
}

function updateCircle() {
  if (!map || !map.isStyleLoaded()) return

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
  if (!map || !map.isStyleLoaded()) return

  const features = props.points.map(point => ({
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

  // Remove existing layer and source if they exist
  if (map.getLayer('points-layer')) {
    map.removeLayer('points-layer')
  }
  if (map.getSource('points')) {
    map.removeSource('points')
  }

  // Add fresh source and layer
  map.addSource('points', {
    type: 'geojson',
    data: geojson
  })

  map.addLayer({
    id: 'points-layer',
    type: 'circle',
    source: 'points',
    paint: {
      'circle-radius': 8,
      // Use data-driven styling based on network type
      'circle-color': [
        'match',
        ['get', 'network'],
        'PA', '#a855f7',      // Purple for Purple Air
        'FEM', '#22c55e',     // Green for FEM
        'EGG', '#3b82f6',     // Blue for AQ Egg
        'SPARTAN', '#f59e0b', // Amber/Orange for SPARTAN
        '#9ca3af'             // Gray fallback
      ],
      'circle-stroke-color': [
        'match',
        ['get', 'network'],
        'PA', '#7c3aed',      // Darker purple
        'FEM', '#16a34a',     // Darker green
        'EGG', '#2563eb',     // Darker blue
        'SPARTAN', '#d97706', // Darker amber
        '#6b7280'             // Gray fallback
      ],
      'circle-stroke-width': 1.5,
      'circle-opacity': 0.9
    }
  })

  // Add click handler for popups
  map.on('click', 'points-layer', (e) => {
    const coordinates = e.features[0].geometry.coordinates.slice()
    const description = buildPopupContent(e.features[0])

    new maplibregl.Popup()
      .setLngLat(coordinates)
      .setHTML(description)
      .addTo(map)
  })

  map.on('mouseenter', 'points-layer', () => {
    map.getCanvas().style.cursor = 'pointer'
  })

  map.on('mouseleave', 'points-layer', () => {
    map.getCanvas().style.cursor = ''
  })
}

function updateSatellite() {
  if (!map || !map.isStyleLoaded()) return

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
    map.getCanvas().style.cursor = ''
  })
}

function updateHex() {
  if (!map || !map.isStyleLoaded()) return

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
    map.getCanvas().style.cursor = ''
  })
}

function updateAllLayers() {
  if (!map || !map.isStyleLoaded()) return
  updateCircle()
  updatePoints()
  updateSatellite()
  updateHex()
}

function zoomToPoint(lat, lon) {
  if (!map) return
  map.flyTo({
    center: [lon, lat],
    zoom: 14,
    essential: true
  })
}

function switchMapStyle(styleId) {
  if (!map || !styleId) return

  const style = mapStyles.find(s => s.id === styleId)
  if (!style) return

  if (styleId === 'satellite') {
    // For satellite, use the base style and add satellite imagery
    map.setStyle(style.url)
    map.once('style.load', () => {
      // Add satellite imagery layer
      map.addSource('satellite-tiles', {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '© Esri'
      })

      // Insert satellite layer below labels
      const layers = map.getStyle().layers
      const firstSymbolId = layers.find(layer => layer.type === 'symbol')?.id

      map.addLayer({
        id: 'satellite-imagery',
        type: 'raster',
        source: 'satellite-tiles',
        paint: {
          'raster-opacity': 0.9
        }
      }, firstSymbolId)

      // Re-add all data layers after style loads
      updateAllLayers()
    })
  } else {
    map.setStyle(style.url)
    map.once('style.load', () => {
      updateAllLayers()
    })
  }
}

defineExpose({
  zoomToPoint
})

onMounted(() => {
  map = new maplibregl.Map({
    container: mapRef.value,
    style: mapStyles[0].url,
    center: [props.center.lon, props.center.lat],
    zoom: 10
  })

  // Add navigation controls
  map.addControl(new maplibregl.NavigationControl(), 'top-right')

  // Handle map clicks to update center
  map.on('click', (e) => {
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
    updateAllLayers()
  })
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})

watch(
  () => ({ ...props.center }),
  (center) => {
    if (!map) return
    map.setCenter([center.lon, center.lat])
    updateAllLayers()
  }
)

watch(
  () => props.radiusKm,
  () => {
    updateAllLayers()
  }
)

watch(
  () => [props.points, props.satelliteProducts, props.hexProducts],
  () => {
    updateAllLayers()
  },
  { deep: true }
)

watch(
  () => props.currentStyle,
  (newStyle) => {
    switchMapStyle(newStyle)
  }
)
</script>
