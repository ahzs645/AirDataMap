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
import { updateHeatmap } from '../utils/layers/heatmapLayer.js'
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
  },
  showHeatmap: {
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

const styleCache = new Map()
const LARGE_RANK_FALLBACK = 1e9
const SMALL_RANK_FALLBACK = -1

function cloneStyleDefinition(definition) {
  if (typeof definition === 'string') {
    return definition
  }
  return JSON.parse(JSON.stringify(definition))
}

function isRankGetter(expression) {
  return Array.isArray(expression) &&
    expression.length >= 2 &&
    expression[0] === 'get' &&
    expression[1] === 'rank'
}

function isCoalescedRank(expression) {
  return Array.isArray(expression) &&
    expression[0] === 'coalesce' &&
    expression.length >= 2 &&
    isRankGetter(expression[1])
}

function wrapRankExpression(expression, fallback) {
  if (isCoalescedRank(expression)) {
    return expression
  }
  if (isRankGetter(expression)) {
    return ['coalesce', expression, fallback]
  }
  return expression
}

function patchFilterNode(node) {
  if (!Array.isArray(node)) {
    return { node, changed: false }
  }

  const [operator, ...rawArgs] = node
  let changed = false
  const patchedArgs = rawArgs.map((arg) => {
    const result = patchFilterNode(arg)
    if (result.changed) {
      changed = true
    }
    return result.node
  })

  const comparisonOperators = new Set(['>=', '>', '<=', '<', '==', '!='])
  let finalArgs = patchedArgs

  if (comparisonOperators.has(operator) && patchedArgs.length >= 2) {
    const adjustedArgs = [...patchedArgs]
    const left = patchedArgs[0]
    const right = patchedArgs[1]

    adjustedArgs[0] = wrapRankExpression(left, operator === '<' || operator === '<=' ? LARGE_RANK_FALLBACK : SMALL_RANK_FALLBACK)
    adjustedArgs[1] = wrapRankExpression(right, operator === '<' || operator === '<=' ? LARGE_RANK_FALLBACK : SMALL_RANK_FALLBACK)

    if (adjustedArgs[0] !== left || adjustedArgs[1] !== right) {
      changed = true
      finalArgs = adjustedArgs
    }
  }

  if (changed || finalArgs.some((arg, index) => arg !== rawArgs[index])) {
    return { node: [operator, ...finalArgs], changed: true }
  }

  return { node, changed: false }
}

function patchStyleDefinition(style) {
  if (!style || !Array.isArray(style.layers)) {
    return style
  }

  const layers = style.layers.map((layer) => {
    if (!layer?.filter) return layer
    const patchedFilter = patchFilterNode(layer.filter)
    if (!patchedFilter.changed) return layer
    return { ...layer, filter: patchedFilter.node }
  })

  return { ...style, layers }
}

async function fetchPatchedStyle(styleId = BASE_STYLE_ID) {
  const styleUrl = getStyleUrl(styleId)

  if (styleCache.has(styleUrl)) {
    return cloneStyleDefinition(styleCache.get(styleUrl))
  }

  try {
    const response = await fetch(styleUrl)
    if (!response.ok) {
      throw new Error(`Failed to load style definition at ${styleUrl}: ${response.status}`)
    }
    const styleJson = await response.json()
    const patchedStyle = patchStyleDefinition(styleJson)
    styleCache.set(styleUrl, patchedStyle)
    return cloneStyleDefinition(patchedStyle)
  } catch (error) {
    console.warn('Failed to fetch style JSON; falling back to remote URL.', error)
    styleCache.set(styleUrl, styleUrl)
    return styleUrl
  }
}

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
  updatePoints(map, props.points, setBaseCursor, props.showHeatmap)
  updateHeatmap(map, props.points, props.showHeatmap)
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

async function switchMapStyle(styleId = BASE_STYLE_ID) {
  if (!map || !styleId) return

  const currentView = {
    center: map.getCenter(),
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch()
  }

  const styleDefinition = await fetchPatchedStyle(styleId)
  map.setStyle(styleDefinition)

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

onMounted(async () => {
  const initialStyle = await fetchPatchedStyle()

  map = new maplibregl.Map({
    container: mapRef.value,
    style: initialStyle,
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

watch(
  () => props.showHeatmap,
  () => {
    // Update heatmap layer when toggle changes
    scheduleLayerUpdate()
  }
)
</script>
