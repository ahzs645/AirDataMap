<template>
  <div class="map-container">
    <div ref="mapRef" class="map-view"></div>
    <div class="map-overlay">
      <span><strong>Region:</strong> {{ summary.regionLabel }}</span>
      <span class="radius-display">
        <strong>Radius:</strong> {{ radiusKm.toFixed(0) }} km
      </span>
      <span v-if="summary.totals.points">Points: {{ summary.totals.points }}</span>
      <span v-if="summary.totals.satellite">Satellite: {{ summary.totals.satellite }}</span>
      <span v-if="summary.totals.grids">Hex Grids: {{ summary.totals.grids }}</span>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import { cellToBoundary } from 'h3-js'

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
let mapInstance
let circleLayer
let pointLayer
let satelliteLayer
let hexLayer

const defaultTile = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

function ensureLeafletLayer(layer) {
  if (layer) {
    layer.remove()
  }
}

function toLatLng(center) {
  return [center.lat, center.lon]
}

function setCircle() {
  if (!mapInstance) return
  ensureLeafletLayer(circleLayer)
  circleLayer = L.circle(toLatLng(props.center), {
    radius: props.radiusKm * 1000,
    color: '#2563eb',
    weight: 1.5,
    fillColor: '#60a5fa',
    fillOpacity: 0.15
  }).addTo(mapInstance)
}

function buildPopupContent(feature) {
  const lines = [`<strong>${feature.name ?? feature.id}</strong>`]
  if (feature.network) {
    lines.push(`<div><small>${feature.network}</small></div>`)
  }
  if (feature.parameters?.length) {
    lines.push(`<div>${feature.parameters.join(', ')}</div>`)
  }
  if (feature.status) {
    lines.push(`<div>Status: ${feature.status}</div>`)
  }
  if (feature.globalCoverage || feature.coverage === 'global') {
    lines.push('<div>Coverage: Global</div>')
  }
  if (feature.temporal) {
    lines.push(`<div>Coverage: ${feature.temporal}</div>`)
  }
  if (feature.frequency) {
    lines.push(`<div>Frequency: ${feature.frequency}</div>`)
  }
  return lines.join('')
}

function setPoints() {
  ensureLeafletLayer(pointLayer)
  if (!props.points?.length || !mapInstance) return
  pointLayer = L.layerGroup(
    props.points.map((point) => {
      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius: 6,
        weight: 1,
        color: '#16a34a',
        fillColor: '#22c55e',
        fillOpacity: 0.8
      })
      marker.bindPopup(buildPopupContent(point))
      return marker
    })
  ).addTo(mapInstance)
}

function geoJsonPolygonToLeaflet(coordinates) {
  return coordinates.map((ring) => ring.map(([lon, lat]) => [lat, lon]))
}

function geometryToLeafletPolygons(geometry, options) {
  if (!geometry) return []
  const polygons = []
  const baseOptions = {
    color: '#7c3aed',
    weight: 1,
    fillOpacity: 0.2,
    fillColor: '#a855f7',
    ...options
  }

  if (geometry.type === 'Polygon') {
    polygons.push(
      L.polygon(geoJsonPolygonToLeaflet(geometry.coordinates), baseOptions)
    )
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((polygonCoords) => {
      polygons.push(
        L.polygon(geoJsonPolygonToLeaflet(polygonCoords), baseOptions)
      )
    })
  }

  return polygons
}

function setSatellite() {
  ensureLeafletLayer(satelliteLayer)
  if (!props.satelliteProducts?.length || !mapInstance) return
  satelliteLayer = L.layerGroup(
    props.satelliteProducts.map((product) => {
      const polygon = L.polygon(geoJsonPolygonToLeaflet(product.geometry.coordinates), {
        color: '#f97316',
        weight: 1.5,
        fillOpacity: 0.1,
        fillColor: '#fb923c'
      })
      polygon.bindPopup(buildPopupContent(product))
      return polygon
    })
  ).addTo(mapInstance)
}

function ensureClosed(coords) {
  if (!coords.length) return coords
  const first = coords[0]
  const last = coords[coords.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...coords, first]
  }
  return coords
}

function setHex() {
  ensureLeafletLayer(hexLayer)
  if (!props.hexProducts?.length || !mapInstance) return

  const hexPolygons = []
  props.hexProducts.forEach((product) => {
    if ((product.globalCoverage || product.geometryIntersects) && product.geometry) {
      const geometryPolygons = geometryToLeafletPolygons(product.geometry)
      geometryPolygons.forEach((polygon) => {
        polygon.bindPopup(buildPopupContent(product))
        hexPolygons.push(polygon)
      })
    }

    product.cellsWithin.forEach((cell) => {
      const boundary = cellToBoundary(cell, true)
      const coordinates = ensureClosed(boundary.map(([lat, lon]) => [lat, lon]))
      const polygon = L.polygon(coordinates, {
        color: '#7c3aed',
        weight: 1,
        fillOpacity: 0.2,
        fillColor: '#a855f7'
      })
      polygon.bindPopup(buildPopupContent(product))
      hexPolygons.push(polygon)
    })
  })

  if (!hexPolygons.length) return

  hexLayer = L.layerGroup(hexPolygons).addTo(mapInstance)
}

function updateAllLayers() {
  if (!mapInstance) return
  setCircle()
  setPoints()
  setSatellite()
  setHex()
}

onMounted(() => {
  mapInstance = L.map(mapRef.value, {
    center: toLatLng(props.center),
    zoom: 5,
    minZoom: 2
  })

  L.tileLayer(defaultTile, {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapInstance)

  mapInstance.on('click', (event) => {
    emit('update:center', { lat: event.latlng.lat, lon: event.latlng.lng })
  })

  updateAllLayers()
})

onBeforeUnmount(() => {
  mapInstance?.remove()
  mapInstance = undefined
})

watch(
  () => ({ ...props.center }),
  (center) => {
    if (!mapInstance) return
    mapInstance.setView(toLatLng(center), mapInstance.getZoom())
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
