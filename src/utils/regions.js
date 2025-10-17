const REGION_BOUNDS = {
  northeast: {
    name: 'Northeast',
    bounds: { minLat: 36, maxLat: 48, minLon: -82, maxLon: -66 }
  },
  southeast: {
    name: 'Southeast',
    bounds: { minLat: 24, maxLat: 37, minLon: -92, maxLon: -75 }
  },
  midwest: {
    name: 'Midwest',
    bounds: { minLat: 36, maxLat: 49, minLon: -104, maxLon: -82 }
  },
  west: {
    name: 'West',
    bounds: { minLat: 24, maxLat: 50, minLon: -125, maxLon: -104 }
  },
  alaska: {
    name: 'Alaska',
    bounds: { minLat: 51, maxLat: 72, minLon: -170, maxLon: -129 }
  }
}

export function determineRegionFromLatLon(lat, lon) {
  for (const [key, region] of Object.entries(REGION_BOUNDS)) {
    const { minLat, maxLat, minLon, maxLon } = region.bounds
    if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) {
      return key
    }
  }
  return 'west'
}

export function getRegionLabel(regionKey) {
  return REGION_BOUNDS[regionKey]?.name ?? regionKey
}

export const REGION_KEYS = Object.keys(REGION_BOUNDS)
