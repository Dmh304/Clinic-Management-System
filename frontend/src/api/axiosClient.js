// Mạnh Hùng - HE200743
// Cấu hình Axios client dùng chung cho toàn bộ ứng dụng.
// Tự động đính kèm token JWT vào header mỗi request, và xử lý lỗi 401 toàn cục
// bằng cách xóa token hết hạn và điều hướng người dùng về trang đăng nhập.
import axios from 'axios'

const axiosClient = axios.create({
  baseURL: '/api',        // Vite proxy forward sang :8080
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor request: tự động lấy token từ localStorage và gắn vào header Authorization của mỗi request
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ecms_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Interceptor response: trả về trực tiếp phần data của response; nếu gặp lỗi 401 (token hết hạn) thì xóa session và chuyển về trang login
axiosClient.interceptors.response.use(
  (res) => res.data,   // trả về { success, message, data } trực tiếp
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url ?? ''
      const hadToken = !!localStorage.getItem('ecms_token')
      // Chỉ redirect khi đang có token mà bị invalid (hết hạn, sai...)
      // Nếu không có token thì là request công khai, không redirect
      if (!url.includes('/auth/login') && hadToken) {
        localStorage.removeItem('ecms_token')
        localStorage.removeItem('ecms_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default axiosClient
