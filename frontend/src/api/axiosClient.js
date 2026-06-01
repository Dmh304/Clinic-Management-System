import axios from 'axios'

const axiosClient = axios.create({
  baseURL: '/api',        // Vite proxy forward sang :8080
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — gắn token vào mọi request
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ecms_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor — unwrap data, xử lý 401 toàn cục
axiosClient.interceptors.response.use(
  (res) => res.data,   // trả về { success, message, data } trực tiếp
  (err) => {
    if (err.response?.status === 401) {
      // Token hết hạn hoặc không hợp lệ — xoá session và về login
      // (Không redirect nếu chính endpoint /auth/login đang gọi)
      const url = err.config?.url ?? ''
      if (!url.includes('/auth/login')) {
        localStorage.removeItem('ecms_token')
        localStorage.removeItem('ecms_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default axiosClient
