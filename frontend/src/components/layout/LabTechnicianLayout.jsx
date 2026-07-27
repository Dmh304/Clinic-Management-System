/**
 * Định nghĩa bố cục chung cho các trang dành riêng cho Kỹ thuật viên Xét nghiệm.
 *
 * Giao diện gồm thanh menu bên trái để chuyển đổi giữa "Xét nghiệm" (lab
 * order queue + nhập kết quả) và "Đơn kính" (eyeglass prescription queue +
 * chi tiết), cùng khu vực chính hiển thị nội dung tương ứng.
 *
 * Lưu ý: /lab/result-entry và /lab/eyeglass-detail là trang xem chi tiết,
 * KHÔNG có mục riêng trên sidebar (điều hướng vào từ danh sách hàng đợi) —
 * nhưng vẫn cần tô sáng đúng mục cha khi đang ở các trang này, nên dùng
 * matchPaths thay vì để NavLink tự so khớp URL chính xác.
 */

import { useDispatch, useSelector } from 'react-redux'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { logout } from '../../store/slices/authSlice'

/*
 * Cấu hình các mục trên thanh Menu điều hướng bên trái (Sidebar).
 * matchPaths liệt kê mọi route thuộc nhóm đó (bao gồm cả trang chi tiết)
 * để xác định trạng thái active — vì NavLink mặc định chỉ so khớp đúng `to`.
 */
const NAV_ITEMS = [
  {
    label: 'Xét nghiệm',
    to: '/lab/queue',
    matchPaths: ['/lab/queue', '/lab/result-entry'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 18h8" />
        <path d="M3 22h18" />
        <path d="M14 22a7 7 0 1 0 0-14h-1" />
        <path d="M9 14h2" />
        <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" />
        <path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
      </svg>
    ),
  },
  {
    label: 'Đơn kính',
    to: '/lab/eyeglass-queue',
    matchPaths: ['/lab/eyeglass-queue', '/lab/eyeglass-detail'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="15" r="4" />
        <circle cx="18" cy="15" r="4" />
        <path d="M10 15h4" />
        <path d="M2 15v-3a2 2 0 0 1 2-2h1" />
        <path d="M22 15v-3a2 2 0 0 0-2-2h-1" />
      </svg>
    ),
  },
]

// Component chính chứa toàn bộ bố cục của phân hệ Lab Technician
export default function LabTechnicianLayout() {
  const dispatch = useDispatch()
  const { user } = useSelector((s) => s.auth)
  const { pathname } = useLocation()

  /*
   * Hàm xử lý sự kiện khi Kỹ thuật viên nhấn nút "Đăng xuất"
   * Sẽ gọi action logout để xóa session và chuyển hướng người dùng về trang chủ
   */
  const handleLogout = () => {
    dispatch(logout())
    window.location.href = '/'
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f0fdf9' }}>
      {/* ── Sidebar (Thanh menu bên trái) ── */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        backgroundColor: '#1c1b1f',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
      }}>
        {/* Brand */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              backgroundColor: '#0d9488',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* Microscope icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 18h8" />
                <path d="M3 22h18" />
                <path d="M14 22a7 7 0 1 0 0-14h-1" />
                <path d="M9 14h2" />
                <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" />
                <path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0d9488', lineHeight: 1.3 }}>Lab</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0d9488', lineHeight: 1.3 }}>Portal</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Main Clinic Branch</div>
        </div>

        {/* Khu vực Menu điều hướng */}
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {NAV_ITEMS.map(({ label, to, matchPaths, icon }) => {
            const isActive = matchPaths.some((p) => pathname.startsWith(p))
            return (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                  textDecoration: 'none', fontSize: 14,
                  fontWeight: 500,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                  backgroundColor: isActive ? '#0d9488' : 'transparent',
                  transition: 'background-color 0.15s, color 0.15s',
                })}
              >
                {icon}
                {label}
              </NavLink>
            )
          })}
        </nav>

        {/* Khu vực thông tin User (Kỹ thuật viên) và nút đăng xuất nằm ở cuối Sidebar */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Link
            to="/"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 8, marginBottom: 6,
              fontSize: 12, color: 'rgba(255,255,255,0.6)', textDecoration: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Về trang chủ
          </Link>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', marginBottom: 6,
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              backgroundColor: '#0d9488', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {user?.fullName?.[0]?.toUpperCase() ?? 'L'}
            </div>
            <span style={{
              fontSize: 12, color: '#fff', fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.fullName ?? user?.email}
            </span>
          </div>

          <button
            style={{
              width: '100%', background: 'none', border: '1px solid rgba(255,255,255,0.15)',
              cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: '6px 0',
              borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Phần Main Content (Bên phải Sidebar) */}
      <main style={{ flex: 1, overflow: 'auto', scrollbarGutter: 'stable' }}>
        <Outlet />
      </main>
    </div>
  )
}
