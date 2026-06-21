import axiosClient from '../api/axiosClient'

export const clinicServiceService = {
  getAllServices: () =>
    axiosClient.get('/v1/services'),
  getServicesByType: (type) =>
    axiosClient.get('/v1/services', { params: { type } }),
}
