import axios from 'axios'

const axiosClient = axios.create({
  baseURL: '/api',           // proxy Vite sẽ forward sang :8080
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor — gắn token
axiosClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor — xử lý lỗi chung
axiosClient.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      // redirect login
    }
    return Promise.reject(err)
  }
)

export default axiosClient