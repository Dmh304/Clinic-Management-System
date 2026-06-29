// UC-57 - Manage System Audit Log
// Service gọi API audit log dành cho Admin: xem danh sách có filter/phân trang,
// xem chi tiết một bản ghi, và export CSV theo đúng filter đang áp dụng.
import axiosClient from '../api/axiosClient'

const auditLogService = {
  // Lấy danh sách audit log có phân trang, kết hợp được nhiều điều kiện filter cùng lúc
  search: (params) => axiosClient.get('/v1/admin/audit-logs', { params }),

  // Lấy chi tiết một bản ghi audit log theo id (xem before/after)
  getById: (id) => axiosClient.get(`/v1/admin/audit-logs/${id}`),

  // Export CSV theo đúng filter đang áp dụng, trả về Blob để tải file
  exportCsv: (params) =>
    axiosClient.get('/v1/admin/audit-logs/export', { params, responseType: 'blob' }),
}

export default auditLogService
