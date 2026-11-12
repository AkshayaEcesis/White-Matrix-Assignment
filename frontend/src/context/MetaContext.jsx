import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { publicApi } from '../api/endpoints'

export const FALLBACK_CHOICES = {
  districts: [
    { value: 'TVM', label: 'Thiruvananthapuram' },
    { value: 'KLM', label: 'Kollam' },
    { value: 'PTA', label: 'Pathanamthitta' },
    { value: 'ALP', label: 'Alappuzha' },
    { value: 'KTM', label: 'Kottayam' },
    { value: 'IDK', label: 'Idukki' },
    { value: 'EKM', label: 'Ernakulam' },
    { value: 'TSR', label: 'Thrissur' },
    { value: 'PLK', label: 'Palakkad' },
    { value: 'MLP', label: 'Malappuram' },
    { value: 'KKD', label: 'Kozhikode' },
    { value: 'WYD', label: 'Wayanad' },
    { value: 'KNR', label: 'Kannur' },
    { value: 'KSD', label: 'Kasaragod' },
  ],
  categories: [
    { value: 'WATER_SUPPLY', label: 'Water Supply & Quality' },
    { value: 'ROADS_BRIDGES', label: 'Roads, Bridges & PWD' },
    { value: 'HEALTH_HOSPITALS', label: 'Health & Government Hospitals' },
    { value: 'ELECTRICITY_POWER', label: 'Electricity & Power' },
    { value: 'PUBLIC_TRANSPORT', label: 'Public Transport & KSRTC' },
    { value: 'EDUCATION_SCHOOLS', label: 'General & Higher Education' },
    { value: 'WASTE_SANITATION', label: 'Sanitation, Waste & LSG' },
    { value: 'REVENUE_LAND', label: 'Revenue, Certificates & Land' },
    { value: 'POLICE_SAFETY', label: 'Public Safety & Police' },
    { value: 'SOCIAL_WELFARE', label: 'Pensions & Social Welfare' },
    { value: 'AGRICULTURE_IRRIGATION', label: 'Agriculture & Irrigation' },
    { value: 'OTHER', label: 'Other Public Services' },
  ],
  statuses: [
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'UNDER_REVIEW', label: 'Under Review' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'RESOLVED', label: 'Resolved' },
    { value: 'REOPENED', label: 'Reopened' },
  ],
  priorities: [
    { value: 'LOW', label: 'Low (30 days)' },
    { value: 'MEDIUM', label: 'Medium (15 days)' },
    { value: 'HIGH', label: 'High (7 days)' },
  ],
}

export const FALLBACK_DEPARTMENTS = [
  { id: 1, code: 'WRD', name: 'Water Resources Department', icon: 'droplets', description: 'Drinking water supply, irrigation projects, canal maintenance.' },
  { id: 2, code: 'HFW', name: 'Health & Family Welfare Department', icon: 'heart-pulse', description: 'Primary health centres, medical colleges, drug availability.' },
  { id: 3, code: 'PWD', name: 'Public Works Department', icon: 'construction', description: 'State highways, major district roads, government buildings.' },
  { id: 4, code: 'GED', name: 'General Education Department', icon: 'graduation-cap', description: 'Government and aided schools, midday meals, school infrastructure.' },
  { id: 5, code: 'REV', name: 'Revenue & Disaster Management', icon: 'landmark', description: 'Certificates, land records, disaster relief and rehabilitation.' },
  { id: 6, code: 'KSEB', name: 'Kerala State Electricity Board', icon: 'zap', description: 'Power supply, billing, damaged poles and transformers.' },
  { id: 7, code: 'TRD', name: 'Transport Department', icon: 'bus', description: 'KSRTC services, road safety, driving licences and permits.' },
  { id: 8, code: 'LSG', name: 'Local Self Government Department', icon: 'recycle', description: 'Panchayats, municipalities, corporations, waste management.' },
]

/** Dropdown choices (districts, categories, statuses, priorities) and departments, loaded once from the API. */
const MetaContext = createContext(null)

export function MetaProvider({ children }) {
  const [choices, setChoices] = useState(FALLBACK_CHOICES)
  const [departments, setDepartments] = useState(FALLBACK_DEPARTMENTS)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      publicApi.choices().catch(() => null),
      publicApi.departments().catch(() => null),
    ])
      .then(([c, d]) => {
        if (c && typeof c === 'object' && Array.isArray(c.districts) && c.districts.length > 0) {
          setChoices({
            districts: Array.isArray(c.districts) ? c.districts : FALLBACK_CHOICES.districts,
            categories: Array.isArray(c.categories) ? c.categories : FALLBACK_CHOICES.categories,
            statuses: Array.isArray(c.statuses) ? c.statuses : FALLBACK_CHOICES.statuses,
            priorities: Array.isArray(c.priorities) ? c.priorities : FALLBACK_CHOICES.priorities,
          })
        }
        if (Array.isArray(d) && d.length > 0) {
          setDepartments(d)
        } else if (d && Array.isArray(d.results) && d.results.length > 0) {
          setDepartments(d.results)
        }
      })
      .catch(() => setError('Could not load live reference data from the server.'))
  }, [])

  const value = useMemo(() => {
    const labelOf = (list) =>
      Object.fromEntries((Array.isArray(list) ? list : []).map((o) => [o.value, o.label]))
    const validChoices = choices && typeof choices === 'object' ? choices : FALLBACK_CHOICES
    const validDepts = Array.isArray(departments) && departments.length > 0 ? departments : FALLBACK_DEPARTMENTS
    return {
      districts: validChoices.districts || FALLBACK_CHOICES.districts,
      categories: validChoices.categories || FALLBACK_CHOICES.categories,
      statuses: validChoices.statuses || FALLBACK_CHOICES.statuses,
      priorities: validChoices.priorities || FALLBACK_CHOICES.priorities,
      departments: validDepts,
      error,
      labels: {
        district: labelOf(validChoices.districts || FALLBACK_CHOICES.districts),
        category: labelOf(validChoices.categories || FALLBACK_CHOICES.categories),
        status: labelOf(validChoices.statuses || FALLBACK_CHOICES.statuses),
        priority: labelOf(validChoices.priorities || FALLBACK_CHOICES.priorities),
      },
    }
  }, [choices, departments, error])

  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMeta() {
  return useContext(MetaContext)
}
