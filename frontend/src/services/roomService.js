// roomService.js
// Gọi API cho UC-55 (Room Catalogue) và UC-56 (Staff Room Roster).
import axiosClient from '../api/axiosClient'

export const roomService = {
  // ── UC-55: Room Catalogue ──────────────────────────────────────
  getAllRooms: (includeInactive = false) =>
    axiosClient.get('/v1/rooms', { params: { includeInactive } }),

  getRoomsByCategory: (category) =>
    axiosClient.get(`/v1/rooms/category/${category}`),

  getRoomById: (id) =>
    axiosClient.get(`/v1/rooms/${id}`),

  createRoom: (payload) =>
    axiosClient.post('/v1/rooms', payload),

  updateRoom: (id, payload) =>
    axiosClient.put(`/v1/rooms/${id}`, payload),

  deactivateRoom: (id) =>
    axiosClient.put(`/v1/rooms/${id}/deactivate`),

  reactivateRoom: (id) =>
    axiosClient.put(`/v1/rooms/${id}/reactivate`),

  // ── UC-56: Staff Room Roster ────────────────────────────────────
  getRoster: (date) =>
    axiosClient.get('/v1/room-roster', { params: date ? { date } : {} }),

  assignRoom: (payload) =>
    axiosClient.post('/v1/room-roster', payload),

  resolveRoom: (staffType, staffId, date) =>
    axiosClient.get('/v1/room-roster/resolve', {
      params: { staffType, staffId, ...(date ? { date } : {}) },
    }),
}