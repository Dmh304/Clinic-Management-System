// Mạnh Hùng - HE200743
// Service xử lý các thao tác xác thực: đăng nhập, đăng ký tài khoản và đổi mật khẩu.
// Tất cả các hàm đều gọi API backend thông qua axiosClient đã cấu hình sẵn base URL và token.
import axiosClient from '../api/axiosClient'

const authService = {
  // Đăng nhập bằng email và mật khẩu, trả về token JWT cùng thông tin người dùng
  login: (credentials) => axiosClient.post('/v1/auth/login', credentials),

  // Đăng nhập bằng tài khoản Google: gửi ID token lên backend để xác minh và tạo/đăng nhập tài khoản
  loginWithGoogle: (idToken) => axiosClient.post('/v1/auth/google', { idToken }),

  // Đăng ký tài khoản bệnh nhân mới với họ tên, email, số điện thoại và mật khẩu
  register: (data) => axiosClient.post('/v1/auth/register', data),

  // Đổi mật khẩu cho người dùng đang đăng nhập (yêu cầu mật khẩu hiện tại và mật khẩu mới)
  changePassword: (data) => axiosClient.put('/v1/auth/change-password', data),
}

export default authService
