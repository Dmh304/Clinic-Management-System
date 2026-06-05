// Mạnh Hùng - HE200743
// Service xử lý các thao tác liên quan đến hồ sơ người dùng đang đăng nhập.
// Hỗ trợ lấy thông tin cá nhân và cập nhật hồ sơ qua API backend.
import axiosClient from '../api/axiosClient'

const userService = {
  // Lấy thông tin hồ sơ của người dùng hiện tại dựa trên token JWT (GET /v1/users/me)
  getProfile: () => axiosClient.get('/v1/users/me'),

  // Cập nhật thông tin hồ sơ cá nhân (họ tên, SĐT, ngày sinh, giới tính, địa chỉ)
  updateProfile: (data) => axiosClient.put('/v1/users/me', data),
}

export default userService
