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
}
