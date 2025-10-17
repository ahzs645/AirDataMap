/**
 * Parse CSV text into array of objects
 * @param {string} csvText - Raw CSV text content
 * @returns {Array} Array of objects with CSV data
 */
export function parseCSV(csvText) {
  const lines = csvText.trim().split('\n')
  if (lines.length === 0) return []

  // Get headers from first line
  const headers = lines[0].split(',').map(h => h.trim())

  // Parse each data line
  const data = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length !== headers.length) continue // Skip malformed lines

    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index]
    })
    data.push(row)
  }

  return data
}

/**
 * Parse a single CSV line, handling quoted values with commas
 * @param {string} line - CSV line to parse
 * @returns {Array} Array of values
 */
function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Add last field
  values.push(current.trim())

  return values
}

/**
 * Convert monitor CSV data to GeoJSON format for mapping
 * @param {Array} monitors - Array of monitor objects from CSV
 * @returns {Object} GeoJSON FeatureCollection
 */
export function monitorsToGeoJSON(monitors) {
  const features = monitors
    .filter(m => m.lat && m.lng && m.network && (m.network === 'PA' || m.network === 'FEM' || m.network === 'EGG'))
    .map(monitor => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(monitor.lng), parseFloat(monitor.lat)]
      },
      properties: {
        id: monitor.sensor_index,
        name: monitor.monitor,
        network: monitor.network,
        latitude: parseFloat(monitor.lat),
        longitude: parseFloat(monitor.lng),
        date: monitor.date,
        pm25_recent: monitor.pm25_recent,
        pm25_24hr: monitor.pm25_24hr,
        temperature: monitor.temperature,
        rh: monitor.rh,
        pressure: monitor.pressure,
        parameters: ['PM2.5'],
        status: 'active'
      }
    }))

  return {
    type: 'FeatureCollection',
    features
  }
}
