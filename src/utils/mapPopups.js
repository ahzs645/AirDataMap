const NETWORK_COLORS = {
  'PA': '#a855f7',
  'FEM': '#22c55e',
  'EGG': '#3b82f6',
  'SPARTAN': '#f59e0b',
  'ASCENT': '#0ea5e9',
  'BC ENV': '#0d9488',
  'EPA IMPROVE': '#14b8a6',
  'EPA NATTS': '#f97316',
  'EPA NCORE': '#6366f1',
  'EPA CSN STN': '#8b5cf6',
  'EPA NEAR ROAD': '#facc15'
}

export function buildPopupContent(feature) {
  const props = feature.properties || feature
  const networkColor = NETWORK_COLORS[props.network] || '#9ca3af'

  const lines = [`<strong style="font-size: 13px;">${props.name ?? props.id}</strong>`]

  if (props.network) {
    lines.push(`<div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
      <div style="width: 6px; height: 6px; border-radius: 50%; background-color: ${networkColor};"></div>
      <small style="color: #64748b; font-size: 11px;">${props.network}</small>
    </div>`)
  }

  // Parse parameters - handle both arrays and JSON strings
  let parameterValues = []
  if (Array.isArray(props.parameters)) {
    parameterValues = props.parameters
  } else if (typeof props.parameters === 'string') {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(props.parameters)
      parameterValues = Array.isArray(parsed) ? parsed : []
    } catch {
      // Fall back to splitting by delimiters
      parameterValues = props.parameters
        .split(/[|,]/)
        .map(param => param.trim())
        .filter(Boolean)
    }
  }

  if (parameterValues.length > 0) {
    const paramTags = parameterValues
      .map(param => `<span style="display: inline-block; background-color: #f1f5f9; color: #475569; padding: 1px 6px; border-radius: 3px; font-size: 10px; margin: 1px;">${param}</span>`)
      .join(' ')
    lines.push(`<div style="margin-top: 4px;">${paramTags}</div>`)
  }

  const statusValue = typeof props.status === 'string' ? props.status.trim().toLowerCase() : ''
  if (statusValue && !['active', 'yes', 'true', '1'].includes(statusValue)) {
    const label = statusValue === 'inactive' ? 'Inactive' : props.status
    lines.push(`<div style="font-size: 11px; margin-top: 3px;">Status: ${label}</div>`)
  }

  if (props.city) {
    lines.push(`<div style="font-size: 11px; margin-top: 3px; color: #64748b;">${props.city}${props.province ? `, ${props.province}` : ''}</div>`)
  }

  if (props.stationOwner) {
    lines.push(`<div style="font-size: 11px; margin-top: 3px;">Owner: ${props.stationOwner}</div>`)
  }

  if (props.globalCoverage || props.coverage === 'global') {
    lines.push('<div style="font-size: 11px; margin-top: 3px;">Coverage: Global</div>')
  }

  if (props.temporal) {
    lines.push(`<div style="font-size: 11px; margin-top: 3px;">Coverage: ${props.temporal}</div>`)
  }

  if (props.frequency) {
    lines.push(`<div style="font-size: 11px; margin-top: 3px;">Frequency: ${props.frequency}</div>`)
  }

  if (props.siteType) {
    lines.push(`<div style="font-size: 11px; margin-top: 3px;">Site Type: ${props.siteType}</div>`)
  }

  if (props.instrumentMentor) {
    lines.push(`<div style="font-size: 11px; margin-top: 3px;">Mentor: ${props.instrumentMentor}</div>`)
  }

  if (props.comments) {
    lines.push(`<div style="font-size: 11px; margin-top: 3px; color: #64748b;">${props.comments}</div>`)
  }

  if (props.url) {
    lines.push(
      `<div style="margin-top: 4px;"><a href="${props.url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline; font-size: 11px;">Station details →</a></div>`
    )
  }

  return lines.join('')
}
