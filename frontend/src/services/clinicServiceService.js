// Mạnh Hùng - HE200743
// Service gọi API để lấy danh sách các dịch vụ khám chữa bệnh của phòng khám.
// Dữ liệu được dùng để hiển thị trên Trang chủ và các trang liên quan đến dịch vụ.
import axiosClient from '../api/axiosClient'

export const clinicServiceService = {
  // Lấy toàn bộ danh sách dịch vụ từ server (GET /v1/services)
  getAllServices: () =>
    axiosClient.get('/v1/services'),
}
