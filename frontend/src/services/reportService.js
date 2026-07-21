// UC-49/50/51/52/53: Gọi API báo cáo & phân tích cho Quản lý.
import axiosClient from '../api/axiosClient'

const range = (from, to) => {
  const p = {}
  if (from) p.from = from
  if (to) p.to = to
  return { params: p }
}

export const reportService = {
  // UC-49
  operationalDashboard: () => axiosClient.get('/v1/reports/dashboard'),
  // UC-50
  revenue: (from, to) => axiosClient.get('/v1/reports/revenue', range(from, to)),
  // UC-51
  patientStatistics: (from, to) => axiosClient.get('/v1/reports/patient-statistics', range(from, to)),
  // UC-52
  staffPerformance: (from, to) => axiosClient.get('/v1/reports/staff-performance', range(from, to)),
  // UC-53
  feedbackReport: (from, to) => axiosClient.get('/v1/reports/feedback', range(from, to)),

  // ── Xuất Excel (CSV UTF-8) — trả về Blob ──
  exportRevenue: (from, to) =>
    axiosClient.get('/v1/reports/revenue/export', { ...range(from, to), responseType: 'blob' }),
  exportPatientStatistics: (from, to) =>
    axiosClient.get('/v1/reports/patient-statistics/export', { ...range(from, to), responseType: 'blob' }),
  exportFeedback: (from, to) =>
    axiosClient.get('/v1/reports/feedback/export', { ...range(from, to), responseType: 'blob' }),
}

// Tải Blob về máy dưới dạng file
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
