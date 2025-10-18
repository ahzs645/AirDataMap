import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { execFile } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

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

const ALLOWED_NETWORKS = new Set([
  'PA',
  'FEM',
  'EGG',
  'ASCENT',
  'EPA IMPROVE Visibility Network',
  'EPA National Air Toxics Trends Stations',
  'EPA NCore Multipollutant Network'
])
const ALLOWED_NETWORK_PREFIXES = ['EPA ']

async function ensureDir(path) {
  await mkdir(path, { recursive: true })
}

function determineRegion(lat, lon) {
  for (const [key, region] of Object.entries(REGION_BOUNDS)) {
    const { minLat, maxLat, minLon, maxLon } = region.bounds
    if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) {
      return key
    }
  }
  return 'west'
}

function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  if (!lines.length) return []

  const headers = parseCSVLine(lines[0])
  const rows = []

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCSVLine(lines[i])
    if (values.length !== headers.length) continue

    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index]
    })

    rows.push(row)
  }

  return rows
}

function toNumber(value) {
  if (typeof value !== 'string') return Number.isFinite(value) ? value : null
  const num = Number.parseFloat(value)
  return Number.isFinite(num) ? num : null
}

function buildMonitorRecord(row) {
  const id = row.sensor_index?.trim()
  const lat = toNumber(row.lat)
  const lon = toNumber(row.lng)
  const network = row.network?.trim()
  const isAllowedNetwork =
    !!network &&
    (ALLOWED_NETWORKS.has(network) ||
      ALLOWED_NETWORK_PREFIXES.some((prefix) => network.startsWith(prefix)))

  if (!id || lat === null || lon === null || !isAllowedNetwork) {
    return null
  }

  return {
    id,
    name: row.monitor?.trim() || id,
    type: 'point',
    network,
    parameters: ['PM2.5'],
    status: 'active',
    latitude: lat,
    longitude: lon,
    province: row.prov_terr?.trim() || null,
    dateObserved: row.date || null,
    pm25Recent: toNumber(row.pm25_recent) ?? null,
    metadata: {
      temperature: toNumber(row.temperature) ?? null,
      humidity: toNumber(row.rh) ?? null,
      pressure: toNumber(row.pressure) ?? null
    },
    source: 'monitors.csv'
  }
}

function buildSpartanRecord(row) {
  const lat = toNumber(row.Latitude)
  const lon = toNumber(row.Longitude)
  if (lat === null || lon === null) {
    return null
  }

  const endDate = row.End_date && row.End_date !== 'None' ? row.End_date : null
  return {
    id: row.Site_Code,
    name: `${row.City}, ${row.Country}`,
    type: 'point',
    network: 'SPARTAN',
    parameters: ['PM2.5', 'Chemical Composition', 'Optical Properties'],
    status: endDate ? 'historical' : 'active',
    latitude: lat,
    longitude: lon,
    startDate: row.Start_date && row.Start_date !== 'None' ? row.Start_date : null,
    endDate,
    city: row.City || null,
    country: row.Country || null,
    source: 'spartan.csv'
  }
}

function groupByRegion(records) {
  const regionMap = new Map()
  for (const key of Object.keys(REGION_BOUNDS)) {
    regionMap.set(key, [])
  }
  // Ensure fallback region exists
  if (!regionMap.has('west')) {
    regionMap.set('west', [])
  }

  for (const record of records) {
    const regionKey = determineRegion(record.latitude, record.longitude)
    if (!regionMap.has(regionKey)) {
      regionMap.set(regionKey, [])
    }
    regionMap.get(regionKey).push(record)
  }

  return regionMap
}

function parseDescription(raw) {
  if (!raw) {
    return { text: null, details: {} }
  }

  let text = raw.replace(/^<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '')
  text = text
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/?p>/gi, '\n')
    .replace(/<[^>]+>/g, '')

  const cleanLines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const details = {}
  for (const line of cleanLines) {
    const match = line.match(/^(.*?):\s*(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      details[key] = value
    }
  }

  return { text: cleanLines.join('\n'), details }
}

function parseAscentPlacemark(block, siteType) {
  const nameMatch = block.match(/<name>([\s\S]*?)<\/name>/)
  const descMatch = block.match(/<description>([\s\S]*?)<\/description>/)
  const coordMatch = block.match(/<coordinates>([\s\S]*?)<\/coordinates>/)

  if (!coordMatch) return null
  const [lonStr = '', latStr = ''] = coordMatch[1].trim().split(',').map((token) => token.trim())
  const longitude = Number.parseFloat(lonStr)
  const latitude = Number.parseFloat(latStr)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

  const { text, details } = parseDescription(descMatch ? descMatch[1] : null)
  const siteNumber = details['Site Number'] ?? details['Site number'] ?? null
  const baseId =
    siteNumber ??
    nameMatch?.[1]
      ?.trim()
      ?.replace(/[^a-z0-9]+/gi, '-')
      ?.replace(/^-|-$/g, '')

  return {
    id: baseId ? `ASCENT-${baseId}` : `ASCENT-${latitude}:${longitude}`,
    name: nameMatch ? nameMatch[1].trim() : 'ASCENT Site',
    type: 'point',
    network: 'ASCENT',
    parameters: ['Aerosol Chemistry', 'Aerosol Physics'],
    status: 'planned',
    latitude,
    longitude,
    siteType: siteType ?? null,
    siteNumber: siteNumber ? Number(siteNumber) : null,
    aqsSiteId: details['AQS Site ID'] ?? null,
    cbsa: details['Core Based Statistical Area (CBSA)'] ?? null,
    address: details['Address'] ?? null,
    currentNetwork: details['Current Network'] ?? null,
    instrumentMentor: details['Instrument Mentor'] ?? null,
    comments: details['Comments'] ?? null,
    source: 'ascent',
    description: text
  }
}

async function extractKmlFromKmz(filePath) {
  return new Promise((resolve, reject) => {
    execFile('unzip', ['-p', filePath, 'doc.kml'], (error, stdout) => {
      if (error) {
        reject(error)
      } else {
        resolve(stdout)
      }
    })
  })
}

async function loadAscentSites() {
  const ascentDir = join(rootDir, 'public/data/ascent')
  try {
    await ensureDir(ascentDir)
  } catch (error) {
    console.warn('Unable to ensure ASCENT directory:', error.message)
    return []
  }

  let kmzFiles = []
  try {
    kmzFiles = (await readdir(ascentDir)).filter((file) => file.toLowerCase().endsWith('.kmz'))
  } catch (error) {
    console.warn('Unable to read ASCENT directory:', error.message)
  }

  const records = []
  for (const file of kmzFiles) {
    try {
      const kml = await extractKmlFromKmz(join(ascentDir, file))
      const placemarks = kml.match(/<Placemark[\s\S]*?<\/Placemark>/g) ?? []
      const siteType = file.toLowerCase().includes('urban') ? 'urban' : file.toLowerCase().includes('rural') ? 'rural' : null

      placemarks.forEach((block) => {
        const record = parseAscentPlacemark(block, siteType)
        if (record) {
          records.push(record)
        }
      })
    } catch (error) {
      console.warn(`Unable to parse ASCENT KMZ "${file}":`, error.message)
    }
  }

  if (records.length) {
    await writeFile(
      join(rootDir, 'public/data/ascent-sites.json'),
      JSON.stringify(records, null, 2)
    )
    console.log(`Converted ${records.length} ASCENT sites from KMZ files.`)
    return records
  }

  // Fallback to previously generated JSON if available
  try {
    const text = await readFile(join(rootDir, 'public/data/ascent-sites.json'), 'utf8')
    const data = JSON.parse(text)
    if (Array.isArray(data)) {
      return data.filter(
        (record) => Number.isFinite(record.latitude) && Number.isFinite(record.longitude)
      )
    }
  } catch (error) {
    console.warn('Unable to load ASCENT dataset:', error.message)
  }

  return []
}

async function loadEpaNetworks() {
  const epaDir = join(rootDir, 'public/data/epa')
  try {
    await ensureDir(epaDir)
  } catch (error) {
    console.warn('Unable to ensure EPA directory:', error.message)
    return []
  }

  let files = []
  try {
    files = (await readdir(epaDir)).filter(
      (file) => file.toLowerCase().endsWith('.json') && file.toLowerCase() !== 'manifest.json'
    )
  } catch (error) {
    console.warn('Unable to read EPA directory:', error.message)
  }

  const records = []

  for (const file of files) {
    try {
      const text = await readFile(join(epaDir, file), 'utf8')
      const data = JSON.parse(text)
      if (!Array.isArray(data)) continue

      for (const entry of data) {
        const network = entry.network?.trim()
        const latitude = toNumber(entry.latitude)
        const longitude = toNumber(entry.longitude)
        if (!network || latitude === null || longitude === null) continue

        const isAllowedNetwork =
          ALLOWED_NETWORKS.has(network) ||
          ALLOWED_NETWORK_PREFIXES.some((prefix) => network.startsWith(prefix))
        if (!isAllowedNetwork) continue

        const statusValue = entry.status
        let status = 'active'
        if (typeof statusValue === 'string') {
          const value = statusValue.trim().toLowerCase()
          if (['inactive', 'no', 'false', '0'].includes(value)) {
            status = 'inactive'
          } else if (['active', 'yes', 'true', '1'].includes(value)) {
            status = 'active'
          } else if (value.length) {
            status = value
          }
        }

        records.push({
          id: entry.id ?? `${network}-${longitude}:${latitude}`,
          name: entry.name ?? network,
          type: 'point',
          network,
          parameters: Array.isArray(entry.parameters) && entry.parameters.length
            ? entry.parameters
            : ['Air Quality'],
          status,
          latitude,
          longitude,
          siteType: entry.siteType ?? null,
          aqsSiteId: entry.aqsSiteId ?? null,
          county: entry.county ?? null,
          state: entry.state ?? null,
          startDate: entry.startDate ?? null,
          endDate: entry.endDate ?? null,
          source: entry.source ?? `epa-${file.replace(/\.json$/i, '')}`
        })
      }
    } catch (error) {
      console.warn(`Unable to load EPA dataset from "${file}":`, error.message)
    }
  }

  return records
}

async function build() {
  await ensureDir(join(rootDir, 'public/data/monitors'))

  const [monitorCSV, spartanCSV] = await Promise.all([
    readFile(join(rootDir, 'public/data/monitors.csv'), 'utf8').catch(() => ''),
    readFile(join(rootDir, 'public/data/spartan.csv'), 'utf8').catch(() => '')
  ])

  const csvRows = parseCSV(monitorCSV)
  const monitorRecords = csvRows
    .map(buildMonitorRecord)
    .filter((record) => record !== null)

  const spartanRows = parseCSV(spartanCSV)
  const spartanRecords = spartanRows
    .map(buildSpartanRecord)
    .filter((record) => record !== null)

  const [ascentRecords, epaRecords] = await Promise.all([
    loadAscentSites(),
    loadEpaNetworks()
  ])

  const allRecords = [...monitorRecords, ...spartanRecords, ...ascentRecords, ...epaRecords]

  // Deduplicate on (id || lat/lon/network)
  const unique = new Map()
  for (const record of allRecords) {
    const key = record.id || `${record.latitude}:${record.longitude}:${record.network}`
    if (!unique.has(key)) {
      unique.set(key, record)
    }
  }

  const dedupedRecords = Array.from(unique.values())

  // Persist all monitors list for quick fetches
  await writeFile(
    join(rootDir, 'public/data/monitors/all.json'),
    JSON.stringify(dedupedRecords, null, 2)
  )

  // Group by region and write individual files
  const regionMap = groupByRegion(dedupedRecords)
  const regionTotals = {}

  for (const [region, records] of regionMap.entries()) {
    const sorted = records.slice().sort((a, b) => {
      return (a.name || '').localeCompare(b.name || '')
    })
    regionTotals[region] = sorted.length
    await writeFile(
      join(rootDir, `public/data/monitors/${region}.json`),
      JSON.stringify(sorted, null, 2)
    )
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    totals: {
      all: dedupedRecords.length,
      byRegion: regionTotals
    },
    sources: {
      monitors: {
        file: 'public/data/monitors.csv',
        records: monitorRecords.length
      },
      spartan: {
        file: 'public/data/spartan.csv',
        records: spartanRecords.length
      },
      ascent: {
        file: 'public/data/ascent-sites.json',
        records: ascentRecords.length
      },
      epa: {
        directory: 'public/data/epa',
        records: epaRecords.length
      }
    },
    networks: Array.from(
      new Set(dedupedRecords.map((record) => record.network).filter(Boolean))
    ).sort()
  }

  await writeFile(
    join(rootDir, 'public/data/manifest.json'),
    JSON.stringify(manifest, null, 2)
  )

  console.log(
    `Generated ${dedupedRecords.length} monitor records across ${Object.keys(regionTotals).length} regions`
  )
}

build().catch((error) => {
  console.error(error)
  process.exit(1)
})
