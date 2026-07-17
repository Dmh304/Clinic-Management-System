import axiosClient from '../api/axiosClient'

// UC-58: Manage Room Catalogue & Service Mapping
export const roomService = {
  getAll: () =>
    axiosClient.get('/v1/rooms'),

  getById: (id) =>
    axiosClient.get(`/v1/rooms/${id}`),

  getActiveByType: (roomType) =>
    axiosClient.get(`/v1/rooms/by-type/${roomType}`),

  create: (data) =>
    axiosClient.post('/v1/rooms', data),

  update: (id, data) =>
    axiosClient.put(`/v1/rooms/${id}`, data),

  deactivate: (id) =>
    axiosClient.delete(`/v1/rooms/${id}`),
}

// UC-59: Manage Staff Room Roster
export const roomRosterService = {
  getRosterForDate: (date) =>
    axiosClient.get('/v1/room-roster', { params: { date } }),

  assign: (data) =>
    axiosClient.post('/v1/room-roster/assign', data),

  getAssignmentsByRoom: (roomId) =>
    axiosClient.get(`/v1/room-roster/by-room/${roomId}`),
}
