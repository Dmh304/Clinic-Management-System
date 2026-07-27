import axiosClient from '../api/axiosClient'

export const subscriptionService = {
  purchase: (data) =>
    axiosClient.post('/v1/subscriptions', data),

  getMy: () =>
    axiosClient.get('/v1/subscriptions/my'),

  getAll: () =>
    axiosClient.get('/v1/subscriptions'),

  getByPatient: (patientId) =>
    axiosClient.get(`/v1/subscriptions/patient/${patientId}`),

  getById: (id) =>
    axiosClient.get(`/v1/subscriptions/${id}`),

  cancel: (id) =>
    axiosClient.patch(`/v1/subscriptions/${id}/cancel`),

  renew: (id) =>
    axiosClient.patch(`/v1/subscriptions/${id}/renew`),

  validateDiscount: (code, amount) =>
    axiosClient.get('/v1/subscriptions/validate-discount', { params: { code, amount } }),
}
