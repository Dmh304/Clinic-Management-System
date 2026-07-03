import { Navigate } from 'react-router-dom'

// Bệnh nhân chưa có trang dashboard tổng hợp riêng — các tính năng (đặt lịch,
// lịch hẹn, hóa đơn, hồ sơ...) đều truy cập từ trang chủ và menu tài khoản.
// Vì vậy điều hướng thẳng về trang chủ thay vì hiển thị trang trắng.
export default function PatientDashboard() {
  return <Navigate to="/" replace />
}
