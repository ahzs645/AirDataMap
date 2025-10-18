export function buildPopupContent(feature) {
  const props = feature.properties || feature
  const lines = [`<strong>${props.name ?? props.id}</strong>`]

  if (props.network) {
    lines.push(`<div><small>${props.network}</small></div>`)
  }

  const parameterValues = Array.isArray(props.parameters)
    ? props.parameters
    : typeof props.parameters === 'string'
      ? props.parameters
          .split(/[|,]/)
          .map(param => param.trim())
          .filter(Boolean)
      : []

  if (parameterValues.length) {
    lines.push(`<div>${parameterValues.join(', ')}</div>`)
  }

  const statusValue = typeof props.status === 'string' ? props.status.trim().toLowerCase() : ''
  if (statusValue && !['active', 'yes', 'true', '1'].includes(statusValue)) {
    const label = statusValue === 'inactive' ? 'Inactive' : props.status
    lines.push(`<div>Status: ${label}</div>`)
  }

  if (props.city) {
    lines.push(`<div>${props.city}${props.province ? `, ${props.province}` : ''}</div>`)
  }

  if (props.stationOwner) {
    lines.push(`<div>Owner: ${props.stationOwner}</div>`)
  }

  if (props.globalCoverage || props.coverage === 'global') {
    lines.push('<div>Coverage: Global</div>')
  }

  if (props.temporal) {
    lines.push(`<div>Coverage: ${props.temporal}</div>`)
  }

  if (props.frequency) {
    lines.push(`<div>Frequency: ${props.frequency}</div>`)
  }

  if (props.siteType) {
    lines.push(`<div>Site Type: ${props.siteType}</div>`)
  }

  if (props.instrumentMentor) {
    lines.push(`<div>Mentor: ${props.instrumentMentor}</div>`)
  }

  if (props.comments) {
    lines.push(`<div>${props.comments}</div>`)
  }

  if (props.url) {
    lines.push(
      `<div><a href="${props.url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline">Station details →</a></div>`
    )
  }

  return lines.join('')
}
