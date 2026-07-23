import axiosClient from '../api/axiosClient'

export const doctorService = {
  getAllDoctors: () =>
    axiosClient.get('/v1/doctors'),

  getDoctorById: (id) =>
    axiosClient.get(`/v1/doctors/${id}`),

  /* Chỉ lấy các bác sĩ được đánh dấu nổi bật — dùng cho khối "Bác sĩ - Chuyên gia" ở trang chủ */
  getFeaturedDoctors: () =>
    axiosClient.get('/v1/doctors', { params: { featured: true } }),

  /* Tải ảnh đại diện bác sĩ lên server, trả về URL — MANAGER/ADMIN */
  uploadAvatar: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return axiosClient.post('/v1/files/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /* Gán URL ảnh đại diện đã upload cho 1 bác sĩ — MANAGER/ADMIN */
  updateAvatar: (id, avatarUrl) =>
    axiosClient.patch(`/v1/doctors/${id}/avatar`, { avatarUrl }),

  /* Cập nhật hồ sơ công khai của bác sĩ — MANAGER/ADMIN */
  updateDoctor: (id, payload) =>
    axiosClient.patch(`/v1/doctors/${id}`, payload),

  /* Bật/tắt hiển thị ở khối "Bác sĩ - Chuyên gia" trên trang chủ — MANAGER/ADMIN */
  updateFeatured: (id, featured) =>
    axiosClient.patch(`/v1/doctors/${id}/featured`, { featured }),
}
