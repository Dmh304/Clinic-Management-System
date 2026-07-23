/** Author: Tuấn - HE204215
 * Author: DucTKH - HE204463
 * Created: 2026-06-01
 * Last Update: 2026-07-17
 * 
 * File này chứa các hàm gọi API (Service) liên quan đến quản lý Lịch hẹn và Hàng đợi
 * Hỗ trợ các thao tác như: lấy danh sách lịch hẹn, cập nhật trạng thái, xác nhận, check-in, và lấy dữ liệu dashboard
*/

import axiosClient from '../api/axiosClient'

export const appointmentService = {

  /* Hàm lấy toàn bộ lịch hẹn dùng cho trang hóa đơn / tìm kiếm lịch hẹn */
  getAllAppointments: (keyword = '') =>
    axiosClient.get('/v1/appointments/search', { params: keyword ? { keyword } : {} }),

  /* Hàm lấy danh sách tất cả các lịch hẹn trong ngày hôm nay */
  getTodayAppointments: () =>
    axiosClient.get('/v1/appointments/today'),

  /* Hàm cập nhật trạng thái của một lịch hẹn (ví dụ: WAITING, IN_PROGRESS, COMPLETED...) */
  updateStatus: (id, status) =>
    axiosClient.patch(`/v1/appointments/${id}/status`, null, { params: { status } }),

  /* Hàm xác nhận lịch hẹn và phân công cho một bác sĩ cụ thể (nếu có).
     reason bắt buộc khi đổi sang bác sĩ khác bác sĩ bệnh nhân đã đặt. */
  confirmAppointment: (id, doctorId, reason) =>
    axiosClient.patch(`/v1/appointments/${id}/confirm`, { doctorId: doctorId || null, reason: reason || null }),

  /* Hàm đánh dấu bệnh nhân đã có mặt tại phòng khám (Check-in) */
  checkInAppointment: (id) =>
    axiosClient.patch(`/v1/appointments/${id}/check-in`),

  /* Hàm tạo mới một lịch hẹn trực tiếp (Walk-in) cho bệnh nhân đến khám không đặt trước */
  createWalkInAppointment: (data) =>
    axiosClient.post('/v1/appointments/walk-in', data),

  /* Hàm lấy thông tin thống kê số liệu lịch hẹn cho Dashboard (tổng số ca, ca chờ, ca hoàn thành...).
     Có thể truyền date (YYYY-MM-DD) để xem thống kê của một ngày bất kỳ. */
  getDashboard: (date) =>
    axiosClient.get('/v1/appointments/dashboard', { params: date ? { date } : {} }),

  /* Hàm lấy danh sách lịch hẹn của một ngày bất kỳ (YYYY-MM-DD) cho lễ tân */
  getDailySchedule: (date) =>
    axiosClient.get('/v1/appointments/daily-schedule', { params: date ? { date } : {} }),

  /* Hàm lấy danh sách hàng đợi bệnh nhân dành riêng cho tài khoản Bác sĩ đang đăng nhập */
  getDoctorQueue: (date) =>
    axiosClient.get('/v1/appointments/doctor-queue', { params: date ? { date } : {} }),

  /* Hàm lấy danh sách khung giờ còn trống của 1 bác sĩ trong 1 ngày (YYYY-MM-DD)
     để bệnh nhân chọn khi đặt lịch */
  getAvailableSlots: (doctorId, date) =>
    axiosClient.get('/v1/appointments/available-slots', { params: { doctorId, date } }),

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

  // Le Thi Bich Ngan - HE204710 | Tạo: 18/07/2026
  // Chức năng: gọi API reassign (đổi bác sĩ/giờ tại quầy) — không gắn BR số cụ
  // thể, hỗ trợ UC-18. Dùng cho modal "Đổi lịch hẹn" trong AppointmentManagementPage.
  /* UC-18: Lễ tân/Manager đổi lịch hẹn (bác sĩ mới và/hoặc giờ mới) — không bắt
     buộc phải đổi cả hai, cần ít nhất 1 trong 3: doctorId / newAppointmentTime / reason.
     Khác rescheduleAppointment (bệnh nhân tự đổi, luôn về lại PENDING): reassign
     giữ nguyên trạng thái hiện tại vì lễ tân xử lý trực tiếp tại quầy. */
  reassignAppointment: (id, { doctorId, newAppointmentTime, reason } = {}) =>
    axiosClient.patch(`/v1/appointments/${id}/reassign`, {
      doctorId: doctorId || null,
      newAppointmentTime: newAppointmentTime || null,
      reason: reason || null,
    }),

  /* Lấy chi tiết 1 lịch hẹn theo id (dùng cho modal chi tiết / mở từ thông báo) */
  getById: (id) =>
    axiosClient.get(`/v1/appointments/${id}`),

  /* UC-13: gửi nhắc lịch thủ công cho 1 lịch hẹn (bỏ qua cửa sổ 24h) */
  sendReminder: (id) =>
    axiosClient.post(`/v1/appointments/${id}/send-reminder`),

  abandonExam: (appointmentId) =>
    axiosClient.post(`/v1/appointments/${appointmentId}/abandon`),
}
