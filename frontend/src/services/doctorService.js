import axiosClient from '../api/axiosClient'

export const doctorService = {
  getAllDoctors: () =>
    axiosClient.get('/v1/doctors'),

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
}
