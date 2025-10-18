<template>
  <div class="relative h-full w-full">
    <div ref="mapRef" class="h-full w-full"></div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { updateCircle } from '../utils/layers/circleLayer.js'
import { updatePoints } from '../utils/layers/pointsLayer.js'
import { updateSatellite } from '../utils/layers/satelliteLayer.js'
import { updateHex } from '../utils/layers/hexLayer.js'
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
  },
  viewMode: {
    type: String,
    default: 'radius'
  }
})

const emit = defineEmits(['update:center'])

const mapRef = ref(null)
let map = null
let pendingStyleRefresh = null
let radiusUpdateTimeout = null
let layerUpdateScheduled = false
let bypassStyleCheck = false

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


function updateAllLayers() {
  if (!map) {
    return
  }

  if (!bypassStyleCheck && !map.isStyleLoaded()) {
    if (!pendingStyleRefresh) {
      pendingStyleRefresh = () => {
        if (!map || !map.isStyleLoaded()) return
        map.off('styledata', pendingStyleRefresh)
        pendingStyleRefresh = null
        scheduleLayerUpdate()
      }
      map.on('styledata', pendingStyleRefresh)
    }
    return
  }

  if (pendingStyleRefresh) {
    map.off('styledata', pendingStyleRefresh)
    pendingStyleRefresh = null
  }

  bypassStyleCheck = false

  updateCircle(map, props.center, props.radiusKm, props.viewMode)
  updatePoints(map, props.points, setBaseCursor)
  updateSatellite(map, props.satelliteProducts, setBaseCursor)
  updateHex(map, props.hexProducts, setBaseCursor)
}

function scheduleLayerUpdate() {
  if (layerUpdateScheduled) return
  layerUpdateScheduled = true
  requestAnimationFrame(() => {
    layerUpdateScheduled = false
    updateAllLayers()
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

  // Use 'styledata' event to catch when the style is loaded but before first render
  // This reduces the flash when switching themes
  const onStyleData = (e) => {
    if (e.dataType !== 'style') return

    map.off('styledata', onStyleData)

    map.jumpTo({
      center: [currentView.center.lng, currentView.center.lat],
      zoom: currentView.zoom,
      bearing: currentView.bearing,
      pitch: currentView.pitch
    })

    // Bypass the isStyleLoaded() check since we know the style is ready
    bypassStyleCheck = true
    updateAllLayers()
    setBaseCursor()
  }

  map.on('styledata', onStyleData)
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
    scheduleLayerUpdate()
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
      scheduleLayerUpdate()
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

watch(
  () => props.viewMode,
  async () => {
    // Wait for next tick to ensure computed properties have updated
    await nextTick()
    // Re-render all layers (including circle) to apply new filtering logic
    scheduleLayerUpdate()
  }
)
</script>
