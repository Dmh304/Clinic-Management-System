import axiosClient from '../api/axiosClient'

export const serviceService = {
  getAllServices: () =>
    axiosClient.get('/v1/services'),

  getServicesByType: (type) =>
    axiosClient.get('/v1/services', { params: { type } }),

  getCategoriesWithServices: () =>
    axiosClient.get('/v1/services/categories'),

  getServiceById: (id) =>
    axiosClient.get(`/v1/services/${id}`),

  register: (data) =>
    axiosClient.post('/v1/services/register', data),

  getMyRegistrations: () =>
    axiosClient.get('/v1/services/my-registrations'),

  getAllRegistrations: () =>
    axiosClient.get('/v1/services/registrations'),

  createPackage: (data) =>
    axiosClient.post('/v1/services/packages', data),

  updatePackage: (id, data) =>
    axiosClient.put(`/v1/services/packages/${id}`, data),

  deletePackage: (id) =>
    axiosClient.delete(`/v1/services/packages/${id}`),

  toggleActive: (id) =>
    axiosClient.patch(`/v1/services/packages/${id}/toggle`),
}
