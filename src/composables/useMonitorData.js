import { computed, reactive, ref, watch } from 'vue'
import * as turf from '@turf/turf'
import { cellToBoundary } from 'h3-js'
import { determineRegionFromLatLon, getRegionLabel } from '../utils/regions'
import { parseCSV } from '../utils/csvParser'

const regionMonitorCache = new Map()
let satelliteCache = null
let gridCache = null
let csvMonitorCache = null
let spartanCache = null

// Force clear caches on any errors
if (typeof window !== 'undefined') {
  csvMonitorCache = null
  spartanCache = null
}

async function fetchJson(path) {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`)
  }
  return response.json()
}

async function fetchCSV(path) {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`)
  }
  return response.text()
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

function createMonitorParameters(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/[|,]/)
      .map((param) => param.trim())
      .filter(Boolean)
  }
  return []
}

function normalizeMonitorRecord(record) {
  const id = record.id ?? record.sensor_index
  const name = record.name ?? record.monitor ?? id
  const network = record.network?.trim()

  if (!id || !network) {
    return null
  }

  const allowedNetworks = new Set([
    'PA',
    'FEM',
    'EGG',
    'SPARTAN',
    'ASCENT',
    'EPA IMPROVE Visibility Network',
    'EPA National Air Toxics Trends Stations',
    'EPA NCore Multipollutant Network'
  ])

  if (
    !allowedNetworks.has(network) &&
    !(typeof network === 'string' && network.startsWith('EPA '))
  ) {
    return null
  }

  const latitude =
    typeof record.latitude === 'number'
      ? record.latitude
      : parseFloat(record.latitude ?? record.lat)
  const longitude =
    typeof record.longitude === 'number'
      ? record.longitude
      : parseFloat(record.longitude ?? record.lng)

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null
  }

  const parameters = createMonitorParameters(record.parameters)
  if (!parameters.length) {
    parameters.push('PM2.5')
  }

  const statusRaw = typeof record.status === 'string' ? record.status.trim().toLowerCase() : null
  let status = 'active'
  if (statusRaw) {
    if (['inactive', 'no', 'false', '0'].includes(statusRaw)) {
      status = 'inactive'
    } else if (['active', 'yes', 'true', '1'].includes(statusRaw)) {
      status = 'active'
    } else {
      status = statusRaw
    }
  }

  return {
    id,
    name,
    network,
    latitude,
    longitude,
    date: record.date ?? record.dateObserved ?? record.date_observed ?? null,
    pm25_recent: record.pm25_recent ?? record.pm25Recent ?? null,
    pm25_24hr: record.pm25_24hr ?? record.pm2524Hr ?? null,
    temperature:
      record.temperature ?? record.metadata?.temperature ?? record.temp ?? null,
    humidity: record.humidity ?? record.metadata?.humidity ?? null,
    pressure: record.pressure ?? record.metadata?.pressure ?? null,
    parameters,
    status,
    siteType: record.siteType ?? null,
    siteNumber: record.siteNumber ?? null,
    aqsSiteId: record.aqsSiteId ?? null,
    cbsa: record.cbsa ?? null,
    address: record.address ?? null,
    currentNetwork: record.currentNetwork ?? null,
    instrumentMentor: record.instrumentMentor ?? null,
    comments: record.comments ?? null,
    source: record.source ?? null,
    description: record.description ?? null
  }
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

  async function loadCSVMonitors() {
    if (csvMonitorCache) return csvMonitorCache

    // Prefer pre-generated JSON when available for static deployments
    try {
      const jsonData = await fetchJson('/data/monitors/all.json')
      if (Array.isArray(jsonData)) {
        const monitors = jsonData
          .map(normalizeMonitorRecord)
          .filter((record) => record !== null)
        if (monitors.length) {
          csvMonitorCache = monitors
          return monitors
        }
      }
    } catch (err) {
      console.warn('Failed to load pre-generated monitor JSON. Falling back to CSV parsing.', err)
    }

    const csvText = await fetchCSV('/data/monitors.csv')
    const parsedData = parseCSV(csvText)

    const monitors = parsedData
      .map((row) => normalizeMonitorRecord(row))
      .filter((record) => record !== null)

    csvMonitorCache = monitors
    return monitors
  }

  async function loadSpartanMonitors() {
    if (spartanCache) return spartanCache
    const csvText = await fetchCSV('/data/spartan.csv')
    const parsedData = parseCSV(csvText)

    // Convert SPARTAN data to monitor format
    const monitors = parsedData
      .filter(row => {
        // Validate coordinates exist and are valid
        if (!row.Latitude || !row.Longitude) return false

        const lat = parseFloat(row.Latitude)
        const lng = parseFloat(row.Longitude)

        return !isNaN(lat) && !isNaN(lng) &&
               lat >= -90 && lat <= 90 &&
               lng >= -180 && lng <= 180
      })
      .map(row => ({
        id: row.Site_Code,
        name: `${row.City}, ${row.Country}`,
        network: 'SPARTAN',
        latitude: parseFloat(row.Latitude),
        longitude: parseFloat(row.Longitude),
        siteCode: row.Site_Code,
        city: row.City,
        country: row.Country,
        startDate: row.Start_date !== 'None' ? row.Start_date : null,
        endDate: row.End_date !== 'None' ? row.End_date : null,
        parameters: ['PM2.5', 'Chemical Composition', 'Optical Properties'],
        status: row.End_date !== 'None' ? 'active' : 'planned'
      }))

    spartanCache = monitors
    return monitors
  }

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
        // Load region-specific datasets alongside CSV- and SPARTAN-based monitors
        const [regionMonitors, csvMonitors, spartanMonitors] = await Promise.all([
          loadRegion(regionKey),
          loadCSVMonitors(),
          loadSpartanMonitors()
        ])
        // Merge datasets while avoiding duplicates (preferring explicit ids when available)
        const combined = [
          ...(Array.isArray(regionMonitors) ? regionMonitors : []),
          ...csvMonitors,
          ...spartanMonitors
        ]

        const seen = new Set()
        const deduped = []
        for (const record of combined) {
          if (!record) continue
          const { latitude, longitude } = record
          if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            continue
          }
          const key = record.id ?? `${latitude}:${longitude}:${record.network ?? 'unknown'}`
          if (seen.has(key)) continue
          seen.add(key)
          deduped.push(record)
        }

        state.monitorRecords = deduped
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
      .filter((record) => {
        // Extra safety check: ensure valid coordinates
        return typeof record.latitude === 'number' &&
               typeof record.longitude === 'number' &&
               !isNaN(record.latitude) &&
               !isNaN(record.longitude)
      })
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
