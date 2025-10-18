export function updateHeatmap(map, points, showHeatmap) {
  if (!map) return

  // Remove existing heatmap layer if it exists
  if (map.getLayer('points-heatmap')) {
    map.removeLayer('points-heatmap')
  }
  if (map.getSource('points-heatmap')) {
    map.removeSource('points-heatmap')
  }

  // If heatmap is disabled, just remove and return
  if (!showHeatmap) {
    return
  }

  // Filter out any points with invalid coordinates and create features
  const features = points
    .filter(point => {
      return typeof point.longitude === 'number' &&
             typeof point.latitude === 'number' &&
             !isNaN(point.longitude) &&
             !isNaN(point.latitude) &&
             point.longitude >= -180 &&
             point.longitude <= 180 &&
             point.latitude >= -90 &&
             point.latitude <= 90
    })
    .map(point => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [point.longitude, point.latitude]
      },
      properties: {
        // We can use this for weighting if needed in the future
        network: point.network
      }
    }))

  const geojson = {
    type: 'FeatureCollection',
    features
  }

  // Add heatmap source
  map.addSource('points-heatmap', {
    type: 'geojson',
    data: geojson
  })

  // Add heatmap layer
  map.addLayer({
    id: 'points-heatmap',
    type: 'heatmap',
    source: 'points-heatmap',
    maxzoom: 15,
    paint: {
      // Increase the heatmap weight based on frequency
      'heatmap-weight': 1,
      // Increase the heatmap color weight by zoom level
      // heatmap-intensity is a multiplier on top of heatmap-weight
      'heatmap-intensity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0,
        1,
        15,
        3
      ],
      // Color ramp for heatmap: Blue (low density) to Red (high density)
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        'rgba(33,102,172,0)',
        0.2,
        'rgb(103,169,207)',
        0.4,
        'rgb(209,229,240)',
        0.6,
        'rgb(253,219,199)',
        0.8,
        'rgb(239,138,98)',
        1,
        'rgb(178,24,43)'
      ],
      // Adjust the heatmap radius by zoom level
      'heatmap-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0,
        2,
        9,
        20,
        15,
        30
      ],
      // Heatmap opacity (always visible when enabled)
      'heatmap-opacity': 0.8
    }
  }, 'points-glow') // Add heatmap below the points layers
}
