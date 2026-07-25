import axiosClient from '../api/axiosClient'

export const serviceService = {
  getAllServices: () =>
    axiosClient.get('/v1/services'),

  getServicesByType: (type) =>
    axiosClient.get('/v1/services', { params: { type } }),

  getCategoriesWithServices: () =>
    axiosClient.get('/v1/services/categories'),

  getServiceById: (id) =>
    axiosClient.get(`/v1/services/${id}`),

  register: (data) =>
    axiosClient.post('/v1/services/register', data),

  getMyRegistrations: () =>
    axiosClient.get('/v1/services/my-registrations'),

  getAllRegistrations: () =>
    axiosClient.get('/v1/services/registrations'),

  // Lễ tân cập nhật trạng thái đăng ký (vd: đã liên hệ tư vấn -> CONFIRMED)
  updateRegistrationStatus: (id, status) =>
    axiosClient.patch(`/v1/services/registrations/${id}/status`, null, { params: { status } }),

  // Lễ tân đặt buổi đến phòng khám từ đăng ký đã được tư vấn:
  // tạo gói + buổi care-session đầu tiên, đánh dấu đăng ký Hoàn tất
  scheduleClinicVisit: (id, payload) =>
    axiosClient.post(`/v1/services/registrations/${id}/schedule`, payload),

  // Lễ tân đăng ký dịch vụ cho khách đến trực tiếp quầy:
  // tạo đăng ký + gói + buổi đầu tiên trong một lần
  // payload: { patientId, serviceId, scheduledDateTime, notes }
  registerAtCounter: (payload) =>
    axiosClient.post('/v1/services/registrations/counter', payload),

  // Tạo ngày 21/07/2026
  // Bệnh nhân tự đăng ký + đặt buổi đầu tiên cho gói CARE ngay trên website
  // (kênh Website — không qua bước chờ tư vấn)
  // payload: { serviceId, scheduledDateTime, notes }
  registerAndBookOnline: (payload) =>
    axiosClient.post('/v1/services/register-and-book', payload),

  // Danh sách tất cả gói kể cả đã ẩn (MANAGER) — để khôi phục gói đã ẩn
  getAllPackages: () =>
    axiosClient.get('/v1/services/packages'),

  // Upload ảnh đại diện, trả về { url }
  uploadImage: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return axiosClient.post('/v1/files/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  createPackage: (data) =>
    axiosClient.post('/v1/services/packages', data),

  updatePackage: (id, data) =>
    axiosClient.put(`/v1/services/packages/${id}`, data),

  deletePackage: (id) =>
    axiosClient.delete(`/v1/services/packages/${id}`),

  toggleActive: (id) =>
    axiosClient.patch(`/v1/services/packages/${id}/toggle`),
}
