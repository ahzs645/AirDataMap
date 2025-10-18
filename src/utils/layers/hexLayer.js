import maplibregl from 'maplibre-gl'
import { cellToBoundary } from 'h3-js'
import { buildPopupContent } from '../mapPopups.js'

export function updateHex(map, hexProducts, setBaseCursor) {
  if (!map) return

  const features = []

  hexProducts.forEach(product => {
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
    setBaseCursor()
  })
}
