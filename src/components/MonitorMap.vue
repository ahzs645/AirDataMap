<template>
  <div class="relative h-full w-full">
    <div ref="mapRef" class="h-full w-full"></div>
    <div
      class="pointer-events-none absolute left-4 top-4 flex max-w-md flex-col gap-1 rounded-xl border border-border bg-background/90 px-4 py-3 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur"
    >
      <span v-if="summary.regionLabel" class="text-sm font-semibold text-foreground">
        {{ summary.regionLabel }}
      </span>
      <span class="text-xs">
        Radius: <span class="font-semibold text-foreground">{{ radiusKm.toFixed(0) }} km</span>
      </span>
      <div class="flex flex-wrap gap-3">
        <span v-if="summary.totals.points">Points: {{ summary.totals.points }}</span>
        <span v-if="summary.totals.satellite">Satellite: {{ summary.totals.satellite }}</span>
        <span v-if="summary.totals.grids">Hex Grids: {{ summary.totals.grids }}</span>
      </div>
    </div>
    <div class="absolute right-4 top-4 flex flex-col overflow-hidden rounded-lg border bg-background text-sm shadow-lg">
      <button
        v-for="style in mapStyles"
        :key="style.id"
        :class="cn(
          'px-4 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          currentStyle === style.id
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'text-foreground'
        )"
        @click="switchMapStyle(style.id)"
        type="button"
      >
        {{ style.name }}
      </button>
    </div>
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
  }
})

const emit = defineEmits(['update:center'])

const mapRef = ref(null)
let map = null
const currentStyle = ref('osm-bright')

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
  if (!map) return

  const circleFeature = turf.circle([props.center.lon, props.center.lat], props.radiusKm, {
    steps: 64,
    units: 'kilometers'
  })

  if (map.getSource('search-circle')) {
    map.getSource('search-circle').setData(circleFeature)
  } else {
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
}

function updatePoints() {
  if (!map) return

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

  if (map.getSource('points')) {
    map.getSource('points').setData(geojson)
  } else {
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
        'circle-color': '#22c55e',
        'circle-stroke-color': '#16a34a',
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

  if (map.getSource('satellite')) {
    map.getSource('satellite').setData(geojson)
  } else {
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

  if (map.getSource('hex-grids')) {
    map.getSource('hex-grids').setData(geojson)
  } else {
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
  if (!map || currentStyle.value === styleId) return

  currentStyle.value = styleId
  const style = mapStyles.find(s => s.id === styleId)

  if (styleId === 'satellite') {
    // For satellite, use the base style and add satellite imagery
    map.setStyle(style.url)
    map.once('styledata', () => {
      // Add satellite imagery layer
      if (!map.getSource('satellite-tiles')) {
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
      }
      updateAllLayers()
    })
  } else {
    map.setStyle(style.url)
    map.once('styledata', () => {
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
</script>
