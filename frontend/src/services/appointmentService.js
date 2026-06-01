import axiosClient from '../api/axiosClient'

export const appointmentService = {
  getTodayAppointments: () =>
    axiosClient.get('/v1/appointments/today'),

  updateStatus: (id, status) =>
    axiosClient.patch(`/v1/appointments/${id}/status`, null, { params: { status } }),
}
