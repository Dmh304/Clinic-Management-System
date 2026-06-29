// Mạnh Hùng - HE200743
// Service xử lý các thao tác xác thực: đăng ký, xác minh email, đăng nhập bệnh nhân/nhân viên (2FA OTP),
// quên/đặt lại mật khẩu và đổi mật khẩu qua OTP.
// Tất cả các hàm đều gọi API backend thông qua axiosClient đã cấu hình sẵn base URL và token.
import axiosClient from '../api/axiosClient'

const authService = {
  // Đăng ký tài khoản bệnh nhân mới (chưa cấp token — cần xác minh email trước khi đăng nhập)
  register: (data) => axiosClient.post('/v1/auth/register', data),

  // Xác minh email bằng token nhận được qua liên kết trong email
  verifyEmail: (token) => axiosClient.get('/v1/auth/verify-email', { params: { token } }),

  // Gửi lại email xác minh cho tài khoản chưa kích hoạt
  resendVerification: (email) => axiosClient.post('/v1/auth/resend-verification', { email }),

  // Đăng nhập bệnh nhân bằng email-hoặc-số điện thoại và mật khẩu, trả về token JWT cùng thông tin người dùng
  login: (credentials) => axiosClient.post('/v1/auth/login', credentials),

  // Đăng nhập bằng tài khoản Google: gửi ID token lên backend để xác minh và tạo/đăng nhập tài khoản
  loginWithGoogle: (idToken) => axiosClient.post('/v1/auth/google', { idToken }),

  // Bước 1 đăng nhập nhân viên: xác thực email/mật khẩu, gửi mã OTP qua email (chưa cấp token)
  staffLogin: (credentials) => axiosClient.post('/v1/auth/staff/login', credentials),

  // Bước 2 đăng nhập nhân viên: xác minh mã OTP, nhận token JWT nếu hợp lệ
  staffVerifyOtp: (email, otp) => axiosClient.post('/v1/auth/staff/verify-otp', { email, otp }),

  // Yêu cầu quên mật khẩu: gửi email chứa liên kết đặt lại mật khẩu (nếu email tồn tại)
  forgotPassword: (email) => axiosClient.post('/v1/auth/forgot-password', { email }),

  // Đặt lại mật khẩu bằng token nhận được qua email
  resetPassword: (data) => axiosClient.post('/v1/auth/reset-password', data),

  // Bước 1 đổi mật khẩu cho người dùng đang đăng nhập (yêu cầu mật khẩu hiện tại và mật khẩu mới)
  changePassword: (data) => axiosClient.put('/v1/auth/change-password', data),

  // Bước 2 đổi mật khẩu: xác minh mã OTP xác nhận rồi áp dụng mật khẩu mới
  verifyChangePasswordOtp: (otp) => axiosClient.post('/v1/auth/change-password/verify-otp', { otp }),
}

export default authService
