import { twMerge } from 'tailwind-merge'

function resolve(value, acc) {
  if (!value) return
  if (typeof value === 'string') {
    acc.push(value)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => resolve(entry, acc))
    return
  }
  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, condition]) => {
      if (condition) acc.push(key)
    })
  }
}

export function cn(...inputs) {
  const classes = []
  inputs.forEach((input) => resolve(input, classes))
  return twMerge(classes.join(' '))
}
