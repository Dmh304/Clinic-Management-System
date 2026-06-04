// Mạnh Hùng - HE200743
// Component bảo vệ route: kiểm tra người dùng đã đăng nhập và có đúng vai trò không.
// Nếu chưa đăng nhập thì redirect về trang login; nếu không đủ quyền thì redirect về trang 403.
// Dùng bọc các route cần xác thực trong AppRouter.
import { useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

// Kiểm tra xác thực và phân quyền: chưa đăng nhập → chuyển login; sai vai trò → chuyển /unauthorized; đúng → render Outlet
export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, role } = useSelector((state) => state.auth)
  const location = useLocation()

  if (!isAuthenticated) {
    // Lưu lại trang đang cố truy cập để sau login redirect về đúng chỗ
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
