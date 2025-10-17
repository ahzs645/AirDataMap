import { computed, reactive, ref, watch } from 'vue'
import * as turf from '@turf/turf'
import { cellToBoundary } from 'h3-js'
import { determineRegionFromLatLon, getRegionLabel } from '../utils/regions'

const regionMonitorCache = new Map()
let satelliteCache = null
let gridCache = null

async function fetchJson(path) {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`)
  }
  return response.json()
}

function ensureClosedCoordinates(coordinates) {
  if (coordinates.length === 0) return coordinates
  const first = coordinates[0]
  const last = coordinates[coordinates.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...coordinates, first]
  }
  return coordinates
}

function h3CellToPolygon(cell) {
  const boundary = cellToBoundary(cell, true)
  const coords = ensureClosedCoordinates(
    boundary.map(([lat, lon]) => [lon, lat])
  )
  return turf.polygon([coords], { cell })
}

export function useMonitorData(centerRef, radiusKmRef, categoriesRef) {
  const loading = ref(false)
  const error = ref(null)

  const state = reactive({
    monitorRegion: null,
    monitorRecords: [],
    satelliteProducts: [],
    hexProducts: []
  })

  async function loadRegion(region) {
    if (regionMonitorCache.has(region)) {
      return regionMonitorCache.get(region)
    }
    const data = await fetchJson(`/data/monitors/${region}.json`)
    regionMonitorCache.set(region, data)
    return data
  }

  async function loadSatellite() {
    if (satelliteCache) return satelliteCache
    satelliteCache = await fetchJson('/data/satellite/coverage.json')
    return satelliteCache
  }

  async function loadHexGrids() {
    if (gridCache) return gridCache
    gridCache = await fetchJson('/data/grids/tropomi.json')
    return gridCache
  }

  watch(
    () => ({ ...centerRef.value }),
    async (center) => {
      error.value = null
      loading.value = true
      try {
        const regionKey = determineRegionFromLatLon(center.lat, center.lon)
        state.monitorRegion = regionKey
        state.monitorRecords = await loadRegion(regionKey)
        state.satelliteProducts = await loadSatellite()
        state.hexProducts = await loadHexGrids()
      } catch (err) {
        console.error(err)
        error.value = err
      } finally {
        loading.value = false
      }
    },
    { immediate: true, deep: true }
  )

  const searchCircle = computed(() => {
    const center = centerRef.value
    const radius = Math.max(radiusKmRef.value, 1)
    return turf.circle([center.lon, center.lat], radius, {
      steps: 64,
      units: 'kilometers'
    })
  })

  const pointMonitors = computed(() => {
    const { monitorRecords } = state
    if (!Array.isArray(monitorRecords)) return []

    const includePoints = categoriesRef.value.points
    if (!includePoints) return []

    return monitorRecords
      .map((record) => {
        const point = turf.point([record.longitude, record.latitude])
        const inside = turf.booleanPointInPolygon(point, searchCircle.value)
        return {
          ...record,
          inside
        }
      })
      .filter((record) => record.inside)
  })

  const satelliteMatches = computed(() => {
    if (!categoriesRef.value.satellite) return []
    if (!Array.isArray(state.satelliteProducts)) return []

    return state.satelliteProducts
      .map((product) => {
        const polygon = turf.polygon(product.geometry.coordinates)
        const intersects = turf.booleanIntersects(polygon, searchCircle.value)
        return {
          ...product,
          intersects
        }
      })
      .filter((product) => product.intersects)
  })

  const hexMatches = computed(() => {
    if (!categoriesRef.value.grids) return []
    if (!Array.isArray(state.hexProducts)) return []

    const circle = searchCircle.value

    return state.hexProducts
      .map((grid) => {
        const cells = Array.isArray(grid.cells) ? grid.cells : []
        const globalCoverage = grid.coverage === 'global' || grid.globalCoverage === true
        const geometryFeature = grid.geometry
          ? turf.feature(grid.geometry, { id: grid.id })
          : null

        if (globalCoverage) {
          return {
            ...grid,
            cellsWithin: cells,
            globalCoverage: true
          }
        }

        const geometryIntersects = geometryFeature
          ? turf.booleanIntersects(geometryFeature, circle)
          : false

        const intersectingCells = cells.filter((cell) => {
          try {
            const polygon = h3CellToPolygon(cell)
            return turf.booleanIntersects(polygon, circle)
          } catch (err) {
            console.warn('Failed to build polygon for cell', cell, err)
            return false
          }
        })

        if (!intersectingCells.length && !geometryIntersects) {
          return null
        }

        return {
          ...grid,
          cellsWithin: intersectingCells,
          geometryIntersects
        }
      })
      .filter(Boolean)
  })

  const summary = computed(() => ({
    regionKey: state.monitorRegion,
    regionLabel: getRegionLabel(state.monitorRegion),
    totals: {
      points: pointMonitors.value.length,
      satellite: satelliteMatches.value.length,
      grids: hexMatches.value.length
    }
  }))

  return {
    loading,
    error,
    searchCircle,
    pointMonitors,
    satelliteMatches,
    hexMatches,
    summary
  }
}
