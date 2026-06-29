// UC-55 - Manage User Account
// Service gọi API quản lý tài khoản Patient dành cho Admin: chỉ xem danh sách, mở khóa
// tài khoản bị khóa, và đặt lại mật khẩu khi patient quên mật khẩu.
import axiosClient from '../api/axiosClient'

const adminPatientService = {
  search: (params) => axiosClient.get('/v1/admin/patients', { params }),
  unlock: (id) => axiosClient.patch(`/v1/admin/patients/${id}/unlock`),
  resetPassword: (id) => axiosClient.patch(`/v1/admin/patients/${id}/reset-password`),
}

export default adminPatientService
