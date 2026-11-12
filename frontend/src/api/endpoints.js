/** All backend calls in one place, grouped by area. Every function returns response data. */
import client from './client'

const data = (promise) => promise.then((r) => r.data)

/** Builds multipart form data, appending each file under the same key. */
export function toFormData(values, fileKey = 'attachments') {
  const form = new FormData()
  Object.entries(values).forEach(([key, value]) => {
    if (key === fileKey || value === undefined || value === null || value === '') return
    form.append(key, value)
  })
  ;(values[fileKey] || []).forEach((file) => form.append(fileKey, file))
  return form
}

export const authApi = {
  login: (body) => data(client.post('/auth/login/', body)),
  register: (body) => data(client.post('/auth/register/', body)),
  logout: () => data(client.post('/auth/logout/')),
  me: () => data(client.get('/auth/me/')),
  officers: (department) => data(client.get('/auth/officers/', { params: { department } })),
}

export const publicApi = {
  choices: () => data(client.get('/meta/choices/')),
  stats: () => data(client.get('/public/stats/')),
  departments: () => data(client.get('/departments/')),
  track: (ref) => data(client.get(`/grievances/track/${encodeURIComponent(ref)}/`)),
  contact: (body) => data(client.post('/contact/', body)),
}

export const citizenApi = {
  list: (params) => data(client.get('/grievances/', { params })),
  stats: () => data(client.get('/grievances/stats/')),
  get: (ref) => data(client.get(`/grievances/${ref}/`)),
  create: (values) => data(client.post('/grievances/', toFormData(values))),
  feedback: (ref, body) => data(client.post(`/grievances/${ref}/feedback/`, body)),
  reopen: (ref, reason) => data(client.post(`/grievances/${ref}/reopen/`, { reason })),
}

export const aiApi = {
  analyse: (body) => data(client.post('/ai/analyse/', body)),
}

export const cmoApi = {
  dashboard: () => data(client.get('/cmo/dashboard/')),
  list: (params) => data(client.get('/cmo/grievances/', { params })),
  get: (ref) => data(client.get(`/cmo/grievances/${ref}/`)),
  startReview: (ref, remarks) => data(client.post(`/cmo/grievances/${ref}/start-review/`, { remarks })),
  assign: (ref, body) => data(client.post(`/cmo/grievances/${ref}/assign/`, body)),
  escalate: (ref, reason) => data(client.post(`/cmo/grievances/${ref}/escalate/`, { reason })),
  triage: (ref, body) => data(client.post(`/cmo/grievances/${ref}/triage/`, body)),
  reopen: (ref, reason) => data(client.post(`/cmo/grievances/${ref}/reopen/`, { reason })),
  addRemark: (ref, body) => data(client.post(`/cmo/grievances/${ref}/remarks/`, body)),
  reports: (params) => data(client.get('/cmo/reports/', { params })),
  reviewReport: (id, body) => data(client.post(`/cmo/reports/${id}/review/`, body)),
  enquiries: (params) => data(client.get('/contact/', { params })),
  markEnquiryReviewed: (id) => data(client.post(`/contact/${id}/mark-reviewed/`)),
}

export const officerApi = {
  dashboard: () => data(client.get('/officer/dashboard/')),
  list: (params) => data(client.get('/officer/grievances/', { params })),
  get: (ref) => data(client.get(`/officer/grievances/${ref}/`)),
  startInvestigation: (ref, remarks) => data(client.post(`/officer/grievances/${ref}/start-investigation/`, { remarks })),
  progress: (ref, remarks) => data(client.post(`/officer/grievances/${ref}/progress/`, { remarks })),
  addRemark: (ref, body) => data(client.post(`/officer/grievances/${ref}/remarks/`, body)),
  submitReport: (ref, values) => data(client.post(`/officer/grievances/${ref}/reports/`, toFormData(values))),
}

export const notificationApi = {
  list: (params) => data(client.get('/notifications/', { params })),
  unreadCount: () => data(client.get('/notifications/unread-count/')),
  markRead: (id) => data(client.post(`/notifications/${id}/read/`)),
  markAllRead: () => data(client.post('/notifications/read-all/')),
}

/** Downloads a permission-checked attachment through the API (never a public URL). */
export async function downloadAttachment(attachment) {
  const response = await client.get(attachment.download_url, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = attachment.original_name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
