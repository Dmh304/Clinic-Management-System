import axiosClient from '../api/axiosClient'

export const appointmentService = {
  getTodayAppointments: () =>
    axiosClient.get('/v1/appointments/today'),

  updateStatus: (id, status) =>
    axiosClient.patch(`/v1/appointments/${id}/status`, null, { params: { status } }),

  confirmAppointment: (id, doctorId) =>
    axiosClient.patch(`/v1/appointments/${id}/confirm`, doctorId ? { doctorId } : null),

  checkInAppointment: (id) =>
    axiosClient.patch(`/v1/appointments/${id}/check-in`),

  createWalkInAppointment: (data) =>
    axiosClient.post('/v1/appointments/walk-in', data),

  getDashboard: () =>
    axiosClient.get('/v1/appointments/dashboard'),

  getDoctorQueue: (date) =>
    axiosClient.get('/v1/appointments/doctor-queue', { params: date ? { date } : {} }),

  bookAppointment: (data) =>
    axiosClient.post('/v1/appointments/book', data),
}
