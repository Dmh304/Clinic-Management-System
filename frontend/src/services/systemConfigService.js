// UC-56 - Configure System and Data
// Service gọi API cấu hình hệ thống dành cho Admin: clinic info, notification templates,
// roles & permissions (read-only). Không có endpoint nào liên quan tới Service/Medicine catalogue.
import axiosClient from '../api/axiosClient'

const systemConfigService = {
  getClinicInfo: () => axiosClient.get('/v1/admin/config/clinic-info'),
  updateClinicInfo: (data) => axiosClient.put('/v1/admin/config/clinic-info', data),

  getNotificationTemplates: () => axiosClient.get('/v1/admin/config/notification-templates'),
  createNotificationTemplate: (data) => axiosClient.post('/v1/admin/config/notification-templates', data),
  updateNotificationTemplate: (id, data) => axiosClient.put(`/v1/admin/config/notification-templates/${id}`, data),
  deactivateNotificationTemplate: (id) => axiosClient.patch(`/v1/admin/config/notification-templates/${id}/deactivate`),

  getRolesPermissions: () => axiosClient.get('/v1/admin/config/roles-permissions'),
}

export default systemConfigService
