import { Protocol } from 'pmtiles'
import maplibregl from 'maplibre-gl'

let pmtilesProtocolRegistered = false

// Configuration for different boundary sources
const BOUNDARY_SOURCES = {
  bcHealth: {
    pmtilesUrl: '/data/boundaries/BCMoH/bcmoh.pmtiles',
    sourceLayer: 'bcmoh',
    idProperty: 'code' // Property to filter on for selecting a boundary
  }
  // Future additions:
  // municipalities: {
  //   pmtilesUrl: '/data/boundaries/municipalities.pmtiles',
  //   sourceLayer: 'municipalities',
  //   idProperty: 'id'
  // }
}

export function updateBoundaryLayer(map, boundarySource, selectedBoundaryId, viewMode, boundaryType) {
  if (!map) return

  // Register PMTiles protocol once
  if (!pmtilesProtocolRegistered) {
    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)
    pmtilesProtocolRegistered = true
  }

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
  if (map.getLayer('boundaries-outline')) {
    map.removeLayer('boundaries-outline')
  }
  if (map.getLayer('boundaries-fill')) {
    map.removeLayer('boundaries-fill')
  }

  // Remove sources
  if (map.getSource('selected-boundary')) {
    map.removeSource('selected-boundary')
  }
  if (map.getSource('boundaries')) {
    map.removeSource('boundaries')
  }

  // Only show boundaries in boundary mode with region sub-mode and when a boundary is selected
  if (viewMode !== 'boundary' || boundaryType !== 'region' || !selectedBoundaryId) {
    return
  }

  // Add PMTiles source
  const sourceId = 'boundaries'
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'vector',
      url: `pmtiles://${sourceConfig.pmtilesUrl}`
    })
  }

  // Only show the selected boundary (no subtle background for all boundaries)
  // Add fill layer for selected boundary
  map.addLayer({
    id: 'selected-boundary-fill',
    type: 'fill',
    source: sourceId,
    'source-layer': sourceConfig.sourceLayer,
    filter: ['==', ['get', sourceConfig.idProperty], selectedBoundaryId],
    paint: {
      'fill-color': '#60a5fa',
      'fill-opacity': 0.15
    }
  })

  // Add outline layer for selected boundary
  map.addLayer({
    id: 'selected-boundary-outline',
    type: 'line',
    source: sourceId,
    'source-layer': sourceConfig.sourceLayer,
    filter: ['==', ['get', sourceConfig.idProperty], selectedBoundaryId],
    paint: {
      'line-color': '#2563eb',
      'line-width': 2
    }
  })
}
