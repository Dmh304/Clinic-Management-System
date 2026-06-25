// ThangNBHE201024
// Service tập hợp tất cả hàm gọi API hóa đơn từ frontend.
// axiosClient trả về { success, data, message } — dùng res.data để lấy payload thực.
import axiosClient from '../api/axiosClient'

export const invoiceService = {
  // Lấy tất cả hóa đơn — dùng cho tab Lịch sử và Redux store
  getAll: () =>
    axiosClient.get('/v1/invoices'),

  // Tìm kiếm hóa đơn theo tên, SĐT hoặc mã hóa đơn
  search: (keyword) =>
    axiosClient.get('/v1/invoices/search', { params: { keyword } }),

  // Lấy chi tiết hóa đơn kèm items — gọi khi mở modal chi tiết, in hoặc gửi email
  getById: (id) =>
    axiosClient.get(`/v1/invoices/${id}`),

  // Tìm hóa đơn theo lịch hẹn — dùng khi kiểm tra lịch hẹn đã có HĐ chưa
  getByAppointmentId: (appointmentId) =>
    axiosClient.get(`/v1/invoices/appointment/${appointmentId}`),

  // Tạo hóa đơn nháp (DRAFT) với danh sách khoản phí
  create: (data) =>
    axiosClient.post('/v1/invoices', data),

  // Phát hành hóa đơn sau khi thu tiền: DRAFT → ISSUED
  issue: (id, paymentMethod, paymentReference) =>
    axiosClient.patch(`/v1/invoices/${id}/issue`, { paymentMethod, paymentReference }),

  // Hủy hóa đơn nháp chưa phát hành
  cancel: (id) =>
    axiosClient.patch(`/v1/invoices/${id}/cancel`),

  // Gửi hóa đơn điện tử qua email đến bệnh nhân (UC-17); timeout 30s vì SMTP có thể chậm
  sendEmail: (id) =>
    axiosClient.post(`/v1/invoices/${id}/send-email`, {}, { timeout: 30000 }),

  // Tải xuống file PDF hóa đơn — responseType blob để xử lý binary
  downloadPdf: (id) =>
    axiosClient.get(`/v1/invoices/${id}/pdf`, { responseType: 'blob' }),
}
