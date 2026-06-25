import axiosClient from '../api/axiosClient'

export const careSessionService = {
  book: (data) =>
    axiosClient.post('/v1/care-sessions', data),

  getMy: () =>
    axiosClient.get('/v1/care-sessions/my'),

  getAll: (date) =>
    axiosClient.get('/v1/care-sessions', { params: date ? { date } : {} }),

  getQueue: () =>
    axiosClient.get('/v1/care-sessions/queue'),

  getBySubscription: (subscriptionId) =>
    axiosClient.get(`/v1/care-sessions/subscription/${subscriptionId}`),

  assignNurse: (id, nurseId) =>
    axiosClient.patch(`/v1/care-sessions/${id}/assign-nurse`, { nurseId }),

  start: (id) =>
    axiosClient.patch(`/v1/care-sessions/${id}/start`),

  complete: (id, nurseNotes) =>
    axiosClient.patch(`/v1/care-sessions/${id}/complete`, { nurseNotes }),

  checkout: (id) =>
    axiosClient.patch(`/v1/care-sessions/${id}/checkout`),

  cancel: (id) =>
    axiosClient.patch(`/v1/care-sessions/${id}/cancel`),

  getNurses: () =>
    axiosClient.get('/v1/care-sessions/nurses'),
}
