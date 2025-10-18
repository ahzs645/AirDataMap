/**
 * Fetch selected EPA AQS monitor layers from the public ArcGIS REST service and normalise
 * them into GeoJSON-like monitor records that match the rest of the app.
 *
 * Usage:
 *   pnpm fetch:aqs
 *
 * Notes:
 * - This script requires outbound network access. If your environment blocks HTTP requests,
 *   download the JSON manually from
 *   https://gispub.epa.gov/arcgis/rest/services/OAR_OAQPS/AQSmonitor_sites/MapServer
 *   and store the results in public/data/epa instead.
 * - The ArcGIS service caps responses at 1000 records per request; pagination is handled
 *   automatically using resultOffset/resultRecordCount.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const SERVICE_URL = 'https://gispub.epa.gov/arcgis/rest/services/OAR_OAQPS/AQSmonitor_sites/MapServer'

const LAYERS = [
  { id: 20, key: 'pm25_speciation', label: 'PM2.5 Chemical Speciation Network', parameters: ['PM2.5 Speciation'] },
  { id: 22, key: 'improve', label: 'IMPROVE Visibility Network', parameters: ['Visibility', 'Aerosol'] },
  { id: 24, key: 'natts', label: 'National Air Toxics Trends Stations', parameters: ['Air Toxics'] },
  { id: 26, key: 'ncore', label: 'NCore Multipollutant Network', parameters: ['Multipollutant'] },
  { id: 28, key: 'near_road', label: 'Near Road Network', parameters: ['Traffic', 'PM2.5'] },
  { id: 30, key: 'pams', label: 'Photochemical Assessment Monitoring Stations', parameters: ['Ozone Precursors'] }
]

const OUTPUT_DIR = 'public/data/epa'
const PAGE_SIZE = 1000

async function fetchLayerPage(layerId, offset) {
  const url = new URL(`${SERVICE_URL}/${layerId}/query`)
  url.searchParams.set('where', '1=1')
  url.searchParams.set('outFields', '*')
  url.searchParams.set('returnGeometry', 'true')
  url.searchParams.set('f', 'json')
  url.searchParams.set('resultOffset', String(offset))
  url.searchParams.set('resultRecordCount', String(PAGE_SIZE))

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to fetch layer ${layerId} (${response.status}): ${text}`)
  }

  return response.json()
}

function normaliseFeature(feature, layer) {
  const attrs = feature.attributes ?? {}
  const geometry = feature.geometry ?? {}
  const latitude = Number.parseFloat(geometry.y)
  const longitude = Number.parseFloat(geometry.x)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  const id = attrs.Site_ID ?? attrs.SITE_ID ?? attrs.OBJECTID ?? `${layer.key}-${longitude}:${latitude}`
  const name = attrs.Name ?? attrs.SITE_NAME ?? attrs.Site_Name ?? attrs.Site_Location ?? layer.label
  const statusAttr = attrs.Status ?? attrs.Status_Desc ?? attrs.Active ?? attrs.Active_Flag ?? 'unknown'
  const status =
    typeof statusAttr === 'string'
      ? statusAttr.trim().toLowerCase()
      : statusAttr === 1
        ? 'active'
        : 'unknown'
  const networkLabel = attrs.Network ?? attrs.Network_Name ?? layer.label

  const parameters = [
    ...(Array.isArray(layer.parameters) ? layer.parameters : []),
    ...(attrs.Parameter ? [attrs.Parameter] : [])
  ].filter(Boolean)

  return {
    id: `${layer.key.toUpperCase()}-${id}`,
    name,
    network: `EPA ${networkLabel}`,
    type: 'point',
    status,
    latitude,
    longitude,
    parameters: parameters.length ? Array.from(new Set(parameters)) : ['Air Quality'],
    aqsSiteId: attrs.AQS_ID ?? attrs.AQS_SITE_ID ?? null,
    county: attrs.County ?? attrs.COUNTY ?? null,
    state: attrs.State ?? attrs.STATE ?? null,
    siteType: attrs.Site_Type ?? attrs.SITE_TYPE ?? null,
    startDate: attrs.Start_Date ?? attrs.START_DATE ?? null,
    endDate: attrs.End_Date ?? attrs.END_DATE ?? null,
    source: `epa-${layer.key}`
  }
}

async function fetchLayer(layer) {
  const allFeatures = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const data = await fetchLayerPage(layer.id, offset)
    const features = data.features ?? []
    if (!features.length) {
      hasMore = false
      break
    }
    allFeatures.push(...features)

    if (features.length < PAGE_SIZE || data.exceededTransferLimit === false) {
      hasMore = false
    } else {
      offset += features.length
    }
  }

  return allFeatures
    .map((feature) => normaliseFeature(feature, layer))
    .filter((feature) => feature !== null)
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })
  const summary = {}
  for (const layer of LAYERS) {
    console.log(`Downloading EPA AQS layer ${layer.id} (${layer.label})...`)
    try {
      const features = await fetchLayer(layer)
      summary[layer.key] = features.length
      const filePath = join(OUTPUT_DIR, `${layer.key}.json`)
      await writeFile(filePath, JSON.stringify(features, null, 2))
      console.log(`  ↳ wrote ${features.length} features to ${filePath}`)
    } catch (error) {
      console.error(`  ↳ failed to fetch layer ${layer.id}:`, error.message)
    }
  }

  await writeFile(
    join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), totals: summary }, null, 2)
  )
  console.log('EPA AQS download complete.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
