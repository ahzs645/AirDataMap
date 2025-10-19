import { ref, computed } from 'vue'
import * as turf from '@turf/turf'

// Cache for boundary geometries
const geometryCache = new Map()
let boundaryIndex = null

async function fetchJson(path) {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`)
  }
  return response.json()
}

async function loadBoundaryIndex() {
  if (boundaryIndex) return boundaryIndex
  boundaryIndex = await fetchJson('/data/boundaries/BCMoH/index.json')
  return boundaryIndex
}

async function loadBoundaryGeometry(level, code) {
  const cacheKey = `${level}:${code}`
  if (geometryCache.has(cacheKey)) {
    return geometryCache.get(cacheKey)
  }

  const levelFiles = {
    'healthAuthority': 'health_authorities.json',
    'hsda': 'health_service_delivery_areas.json',
    'lha': 'local_health_areas.json',
    'chsa': 'community_health_service_areas.json'
  }

  const levelProps = {
    'healthAuthority': 'HLTH_AUTHORITY_CODE',
    'hsda': 'HLTH_SERVICE_DLVR_AREA_CODE',
    'lha': 'LOCAL_HLTH_AREA_CODE',
    'chsa': 'CMNTY_HLTH_SERV_AREA_CODE'
  }

  const filename = levelFiles[level]
  const propName = levelProps[level]

  if (!filename || !propName) {
    throw new Error(`Unknown boundary level: ${level}`)
  }

  const data = await fetchJson(`/data/boundaries/BCMoH/${filename}`)
  const feature = data.features.find(f => f.properties[propName] === code)

  if (!feature) {
    throw new Error(`Boundary not found: ${level}:${code}`)
  }

  geometryCache.set(cacheKey, feature)
  return feature
}

export function useBoundaryData() {
  const loading = ref(false)
  const error = ref(null)
  const index = ref(null)
  const selectedBoundary = ref(null)
  const selectedBoundaryGeometry = ref(null)

  // Load the index on first use
  const loadIndex = async () => {
    if (index.value) return
    loading.value = true
    error.value = null
    try {
      index.value = await loadBoundaryIndex()
    } catch (err) {
      console.error('Failed to load boundary index:', err)
      error.value = err
    } finally {
      loading.value = false
    }
  }

  // Select a boundary and load its geometry
  const selectBoundary = async (level, code) => {
    if (!code) {
      selectedBoundary.value = null
      selectedBoundaryGeometry.value = null
      return
    }

    console.time(`Loading boundary ${level}:${code}`)
    loading.value = true
    error.value = null
    try {
      const feature = await loadBoundaryGeometry(level, code)
      console.timeEnd(`Loading boundary ${level}:${code}`)

      console.time(`Processing boundary polygon`)
      selectedBoundaryGeometry.value = feature

      // Also store the boundary info
      const levelKey = {
        'healthAuthority': 'healthAuthorities',
        'hsda': 'healthServiceDeliveryAreas',
        'lha': 'localHealthAreas',
        'chsa': 'communityHealthServiceAreas'
      }[level]

      if (index.value && levelKey) {
        const boundaryInfo = index.value[levelKey].find(b => b.code === code)
        selectedBoundary.value = {
          level,
          ...boundaryInfo,
          geometry: feature.geometry
        }
      }
      console.timeEnd(`Processing boundary polygon`)
    } catch (err) {
      console.error('Failed to load boundary geometry:', err)
      error.value = err
    } finally {
      loading.value = false
    }
  }

  // Get the polygon for the selected boundary
  const boundaryPolygon = computed(() => {
    if (!selectedBoundaryGeometry.value) return null

    const { geometry } = selectedBoundaryGeometry.value
    if (!geometry) return null

    // Handle both Polygon and MultiPolygon
    if (geometry.type === 'Polygon') {
      return turf.polygon(geometry.coordinates)
    } else if (geometry.type === 'MultiPolygon') {
      return turf.multiPolygon(geometry.coordinates)
    }
    return null
  })

  // Search boundaries by name
  const searchBoundaries = (query, level = null) => {
    if (!index.value || !query) return []

    const searchLevels = level
      ? [level]
      : ['healthAuthorities', 'healthServiceDeliveryAreas', 'localHealthAreas', 'communityHealthServiceAreas']

    const results = []
    const lowerQuery = query.toLowerCase()

    for (const levelKey of searchLevels) {
      const boundaries = index.value[levelKey] || []
      const matches = boundaries.filter(b =>
        b.name.toLowerCase().includes(lowerQuery) ||
        b.code.includes(lowerQuery)
      )

      results.push(...matches.map(b => ({
        ...b,
        level: levelKey.replace('healthAuthorities', 'healthAuthority')
                      .replace('healthServiceDeliveryAreas', 'hsda')
                      .replace('localHealthAreas', 'lha')
                      .replace('communityHealthServiceAreas', 'chsa')
      })))
    }

    return results
  }

  // Get boundaries for a specific level
  const getBoundariesByLevel = (level) => {
    if (!index.value) return []

    const levelKey = {
      'healthAuthority': 'healthAuthorities',
      'hsda': 'healthServiceDeliveryAreas',
      'lha': 'localHealthAreas',
      'chsa': 'communityHealthServiceAreas'
    }[level]

    return index.value[levelKey] || []
  }

  // Get child boundaries (e.g., HSDAs within a Health Authority)
  const getChildBoundaries = (parentLevel, parentCode) => {
    if (!index.value) return []

    const childMapping = {
      'healthAuthority': {
        level: 'hsda',
        key: 'healthServiceDeliveryAreas',
        parentProp: 'healthAuthorityCode'
      },
      'hsda': {
        level: 'lha',
        key: 'localHealthAreas',
        parentProp: 'hsdaCode'
      },
      'lha': {
        level: 'chsa',
        key: 'communityHealthServiceAreas',
        parentProp: 'lhaCode'
      }
    }

    const mapping = childMapping[parentLevel]
    if (!mapping) return []

    const boundaries = index.value[mapping.key] || []
    return boundaries.filter(b => b[mapping.parentProp] === parentCode)
  }

  return {
    loading,
    error,
    index,
    selectedBoundary,
    selectedBoundaryGeometry,
    boundaryPolygon,
    loadIndex,
    selectBoundary,
    searchBoundaries,
    getBoundariesByLevel,
    getChildBoundaries
  }
}
