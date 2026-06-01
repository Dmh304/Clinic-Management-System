import axiosClient from '../api/axiosClient'

const authService = {
  login: (credentials) => axiosClient.post('/v1/auth/login', credentials),
  register: (data) => axiosClient.post('/v1/auth/register', data),
}

export default authService
