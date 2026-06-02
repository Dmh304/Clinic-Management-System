import axiosClient from '../api/axiosClient'

const userService = {
  getProfile: () => axiosClient.get('/v1/users/me'),
  updateProfile: (data) => axiosClient.put('/v1/users/me', data),
}

export default userService
