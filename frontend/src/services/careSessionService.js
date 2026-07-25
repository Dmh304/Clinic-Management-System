import axiosClient from '../api/axiosClient'

export const careSessionService = {
  book: (data) =>
    axiosClient.post('/v1/care-sessions', data),

  getMy: () =>
    axiosClient.get('/v1/care-sessions/my'),

  getAll: (date) =>
    axiosClient.get('/v1/care-sessions', { params: date ? { date } : {} }),

  getQueue: (date) =>
    axiosClient.get('/v1/care-sessions/queue', { params: date ? { date } : {} }),

  getById: (id) =>
    axiosClient.get(`/v1/care-sessions/${id}`),

  getBySubscription: (subscriptionId) =>
    axiosClient.get(`/v1/care-sessions/subscription/${subscriptionId}`),

  assignNurse: (id, nurseId, override = false) =>
    axiosClient.patch(`/v1/care-sessions/${id}/assign-nurse`, { nurseId, override }),

  autoAssignRemaining: (date) =>
    axiosClient.post('/v1/care-sessions/auto-assign', null, { params: { date } }),

  checkIn: (id) =>
    axiosClient.patch(`/v1/care-sessions/${id}/check-in`),

  start: (id) =>
    axiosClient.patch(`/v1/care-sessions/${id}/start`),

  complete: (id, nurseNotes, isIncident = false) =>
    axiosClient.patch(`/v1/care-sessions/${id}/complete`, { nurseNotes, isIncident }),

  checkout: (id) =>
    axiosClient.patch(`/v1/care-sessions/${id}/checkout`),

  cancel: (id) =>
    axiosClient.patch(`/v1/care-sessions/${id}/cancel`),

  getNurses: () =>
    axiosClient.get('/v1/care-sessions/nurses'),
}
