/** Author: Tuấn - HE204215
 * 
 * File này chứa các hàm gọi API (Service) liên quan đến quản lý Lịch hẹn và Hàng đợi
 * Hỗ trợ các thao tác như: lấy danh sách lịch hẹn, cập nhật trạng thái, xác nhận, check-in, và lấy dữ liệu dashboard
*/
/**
 * Service: appointmentService
 * Chứa danh sách các hàm gọi API liên quan đến nghiệp vụ Lịch hẹn (Appointments).
 * DucTKHHE204463
 */

import axiosClient from '../api/axiosClient'

export const appointmentService = {

  /* Hàm lấy danh sách tất cả các lịch hẹn trong ngày hôm nay */
  getTodayAppointments: () =>
    axiosClient.get('/v1/appointments/today'),

  /* Hàm cập nhật trạng thái của một lịch hẹn (ví dụ: WAITING, IN_PROGRESS, COMPLETED...) */
  updateStatus: (id, status) =>
    axiosClient.patch(`/v1/appointments/${id}/status`, null, { params: { status } }),

  /* Hàm xác nhận lịch hẹn và phân công cho một bác sĩ cụ thể (nếu có) */
  confirmAppointment: (id, doctorId) =>
    axiosClient.patch(`/v1/appointments/${id}/confirm`, doctorId ? { doctorId } : null),

  /* Hàm đánh dấu bệnh nhân đã có mặt tại phòng khám (Check-in) */
  checkInAppointment: (id) =>
    axiosClient.patch(`/v1/appointments/${id}/check-in`),

  /* Hàm tạo mới một lịch hẹn trực tiếp (Walk-in) cho bệnh nhân đến khám không đặt trước */
  createWalkInAppointment: (data) =>
    axiosClient.post('/v1/appointments/walk-in', data),

  /* Hàm lấy thông tin thống kê số liệu lịch hẹn cho Dashboard (tổng số ca, ca chờ, ca hoàn thành...) */
  getDashboard: () =>
    axiosClient.get('/v1/appointments/dashboard'),

  /* Hàm lấy danh sách hàng đợi bệnh nhân dành riêng cho tài khoản Bác sĩ đang đăng nhập */
  getDoctorQueue: (date) =>
    axiosClient.get('/v1/appointments/doctor-queue', { params: date ? { date } : {} }),

  /* Hàm đặt trước một lịch hẹn khám bệnh mới (từ phía bệnh nhân) */
  bookAppointment: (data) =>
    axiosClient.post('/v1/appointments/book', data),

  getMyAppointments: () =>
    axiosClient.get('/v1/appointments/my'),
}
