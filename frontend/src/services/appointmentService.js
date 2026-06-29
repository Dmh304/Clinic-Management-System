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

  /* Hàm lấy toàn bộ lịch hẹn (dùng cho trang hóa đơn - gọi search với keyword rỗng) */
  getAllAppointments: () =>
    axiosClient.get('/v1/appointments/search'),

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
  getDashboard: (date) =>
    axiosClient.get('/v1/appointments/dashboard', { params: { date }}),

  /* Hàm lấy danh sách hàng đợi bệnh nhân dành riêng cho tài khoản Bác sĩ đang đăng nhập */
  getDoctorQueue: (date) =>
    axiosClient.get('/v1/appointments/doctor-queue', { params: date ? { date } : {} }),

  /* Hàm đặt trước một lịch hẹn khám bệnh mới (từ phía bệnh nhân) */
  bookAppointment: (data) =>
    axiosClient.post('/v1/appointments/book', data),

  getMyAppointments: () =>
    axiosClient.get('/v1/appointments/my'),

  /* Huỷ lịch hẹn (bệnh nhân tự huỷ hoặc lễ tân huỷ), có thể kèm lý do */
  cancelAppointment: (id, reason) =>
    axiosClient.patch(`/v1/appointments/${id}/cancel`, reason ? { reason } : null),

  /* Bệnh nhân tự đổi giờ khám trong giới hạn cho phép */
  rescheduleAppointment: (id, newAppointmentTime) =>
    axiosClient.patch(`/v1/appointments/${id}/reschedule`, { newAppointmentTime }),

  /* Lấy chi tiết 1 lịch hẹn theo id (dùng cho modal chi tiết / mở từ thông báo) */
  getById: (id) =>
    axiosClient.get(`/v1/appointments/${id}`),

  /* UC-13: gửi nhắc lịch thủ công cho 1 lịch hẹn (bỏ qua cửa sổ 24h) */
  sendReminder: (id) =>
    axiosClient.post(`/v1/appointments/${id}/send-reminder`),

  abandonExam: (appointmentId) =>
    axiosClient.post(`/v1/appointments/${appointmentId}/abandon`),
}
