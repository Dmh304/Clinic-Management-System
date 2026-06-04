/**
 * Service: appointmentService
 * Chứa danh sách các hàm gọi API liên quan đến nghiệp vụ Lịch hẹn (Appointments).
 * DucTKHHE204463
 */

import axiosClient from '../api/axiosClient'

export const appointmentService = {
  getTodayAppointments: () =>
    axiosClient.get('/v1/appointments/today'),

  updateStatus: (id, status) =>
    axiosClient.patch(`/v1/appointments/${id}/status`, null, { params: { status } }),

  /**
   * Gọi API xác nhận lịch hẹn và chỉ định bác sĩ khám.
   * DucTKH
   */
  confirmAppointment: (id, doctorId) =>
    axiosClient.patch(`/v1/appointments/${id}/confirm`, doctorId ? { doctorId } : null),

  /**
   * Gọi API check-in tiếp nhận bệnh nhân.
   * DucTKH
   */
  checkInAppointment: (id) =>
    axiosClient.patch(`/v1/appointments/${id}/check-in`),

  /**
   * Gọi API đăng ký lịch hẹn vãng lai trực tiếp tại quầy.
   * DucTKH
   */
  createWalkInAppointment: (data) =>
    axiosClient.post('/v1/appointments/walk-in', data),

  getDashboard: () =>
    axiosClient.get('/v1/appointments/dashboard'),

  getDoctorQueue: (date) =>
    axiosClient.get('/v1/appointments/doctor-queue', { params: date ? { date } : {} }),

  bookAppointment: (data) =>
    axiosClient.post('/v1/appointments/book', data),
}
