const dateFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

export const formatDate = (value) => (value ? dateFmt.format(new Date(value)) : '—')
export const formatDateTime = (value) => (value ? dateTimeFmt.format(new Date(value)) : '—')

export function timeAgo(value) {
  if (!value) return ''
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000)
  const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]]
  for (const [unit, size] of units) {
    const amount = Math.floor(seconds / size)
    if (amount >= 1) return `${amount} ${unit}${amount > 1 ? 's' : ''} ago`
  }
  return 'just now'
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export const ROLE_HOME = { CITIZEN: '/citizen', CMO_ADMIN: '/cmo', OFFICER: '/officer' }

/** Path to a grievance detail page for the current user's role. */
export function grievancePath(role, ref) {
  if (role === 'CMO_ADMIN') return `/cmo/grievances/${ref}`
  if (role === 'OFFICER') return `/officer/grievances/${ref}`
  return `/citizen/grievances/${ref}`
}
