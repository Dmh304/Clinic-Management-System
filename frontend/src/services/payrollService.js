// UC-54: Quản lý duyệt bảng lương.
import axiosClient from '../api/axiosClient'

export const payrollService = {
  generate: (year, month) => axiosClient.post('/v1/payroll/generate', null, { params: { year, month } }),
  listPeriods: () => axiosClient.get('/v1/payroll/periods'),
  getPeriod: (id) => axiosClient.get(`/v1/payroll/periods/${id}`),
  updateItem: (id, data) => axiosClient.patch(`/v1/payroll/items/${id}`, data),
  approve: (id) => axiosClient.post(`/v1/payroll/periods/${id}/approve`),
}
