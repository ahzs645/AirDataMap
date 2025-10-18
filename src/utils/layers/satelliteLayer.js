import maplibregl from 'maplibre-gl'
import { buildPopupContent } from '../mapPopups.js'

export function updateSatellite(map, satelliteProducts, setBaseCursor) {
  if (!map) return

  const features = satelliteProducts.map(product => ({
    type: 'Feature',
    geometry: product.geometry,
    properties: product
  }))

  const geojson = {
    type: 'FeatureCollection',
    features
  }

  // Remove existing layers and source if they exist
  if (map.getLayer('satellite-outline')) {
    map.removeLayer('satellite-outline')
  }
  if (map.getLayer('satellite-layer')) {
    map.removeLayer('satellite-layer')
  }
  if (map.getSource('satellite')) {
    map.removeSource('satellite')
  }

  // Add fresh source and layers
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
    setBaseCursor()
  })
}
