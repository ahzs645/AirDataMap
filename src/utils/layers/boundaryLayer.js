// Cache for simplified boundary GeoJSON
const boundaryDataCache = new Map()

// Configuration for different boundary sources
const BOUNDARY_SOURCES = {
  bcHealth: {
    levelFiles: {
      'healthAuthority': '/data/boundaries/BCMoH/simplified/health_authorities.json',
      'hsda': '/data/boundaries/BCMoH/simplified/health_service_delivery_areas.json',
      'lha': '/data/boundaries/BCMoH/simplified/local_health_areas.json',
      'chsa': '/data/boundaries/BCMoH/simplified/community_health_service_areas.json'
    },
    levelProps: {
      'healthAuthority': 'HLTH_AUTHORITY_CODE',
      'hsda': 'HLTH_SERVICE_DLVR_AREA_CODE',
      'lha': 'LOCAL_HLTH_AREA_CODE',
      'chsa': 'CMNTY_HLTH_SERV_AREA_CODE'
    },
    idProperty: 'code'
  }
  // Future additions:
  // municipalities: {
  //   levelFiles: { 'municipality': '/data/boundaries/municipalities.json' },
  //   levelProps: { 'municipality': 'MUN_ID' },
  //   idProperty: 'id'
  // }
}

async function fetchBoundaryData(url) {
  if (boundaryDataCache.has(url)) {
    return boundaryDataCache.get(url)
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  const data = await response.json()
  boundaryDataCache.set(url, data)
  return data
}

export async function updateBoundaryLayer(map, boundarySource, selectedBoundaryId, selectedBoundaryLevel, viewMode, boundaryType) {
  if (!map) return

  const sourceConfig = BOUNDARY_SOURCES[boundarySource]
  if (!sourceConfig) {
    console.warn(`Unknown boundary source: ${boundarySource}`)
    return
  }

  // Remove existing layers if they exist
  if (map.getLayer('selected-boundary-outline')) {
    map.removeLayer('selected-boundary-outline')
  }
  if (map.getLayer('selected-boundary-fill')) {
    map.removeLayer('selected-boundary-fill')
  }

  // Remove source
  if (map.getSource('boundaries')) {
    map.removeSource('boundaries')
  }

  // Only show boundaries in boundary mode with region sub-mode and when a boundary is selected
  if (viewMode !== 'boundary' || boundaryType !== 'region' || !selectedBoundaryId || !selectedBoundaryLevel) {
    return
  }

  // Get the appropriate file for this level
  const fileUrl = sourceConfig.levelFiles[selectedBoundaryLevel]
  if (!fileUrl) {
    console.warn(`Unknown boundary level: ${selectedBoundaryLevel}`)
    return
  }

  try {
    // Fetch the simplified GeoJSON
    const boundaryData = await fetchBoundaryData(fileUrl)

    // Get the property name for filtering
    const propName = sourceConfig.levelProps[selectedBoundaryLevel]

    // Filter to only the selected boundary feature
    const selectedFeature = boundaryData.features.find(
      f => f.properties[propName] === selectedBoundaryId
    )

    if (!selectedFeature) {
      console.warn(`Boundary not found: ${selectedBoundaryLevel}:${selectedBoundaryId}`)
      return
    }

    // Add GeoJSON source with only the selected feature
    map.addSource('boundaries', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [selectedFeature]
      }
    })

    // Add fill layer for selected boundary
    map.addLayer({
      id: 'selected-boundary-fill',
      type: 'fill',
      source: 'boundaries',
      paint: {
        'fill-color': '#60a5fa',
        'fill-opacity': 0.15
      }
    })

    // Add outline layer for selected boundary
    map.addLayer({
      id: 'selected-boundary-outline',
      type: 'line',
      source: 'boundaries',
      paint: {
        'line-color': '#2563eb',
        'line-width': 2
      }
    })
  } catch (error) {
    console.error('Failed to load boundary data:', error)
  }
}
