// UC-55 - Manage User Account
// Service gọi API quản lý tài khoản nhân viên dành cho Admin: tạo, sửa, kích hoạt,
// vô hiệu hoá và xem danh sách/chi tiết tài khoản (không có endpoint xoá cứng — BR-09).
import axiosClient from '../api/axiosClient'

const adminUserService = {
  search: (params) => axiosClient.get('/v1/admin/users', { params }),
  getById: (id) => axiosClient.get(`/v1/admin/users/${id}`),
  create: (data) => axiosClient.post('/v1/admin/users', data),
  update: (id, data) => axiosClient.put(`/v1/admin/users/${id}`, data),
  activate: (id) => axiosClient.patch(`/v1/admin/users/${id}/activate`),
  deactivate: (id) => axiosClient.patch(`/v1/admin/users/${id}/deactivate`),
  unlock: (id) => axiosClient.patch(`/v1/admin/users/${id}/unlock`),
  resetPassword: (id) => axiosClient.patch(`/v1/admin/users/${id}/reset-password`),
  remove: (id) => axiosClient.delete(`/v1/admin/users/${id}`),
}

export default adminUserService
