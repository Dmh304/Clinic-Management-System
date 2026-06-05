/** Tuấn - HE204215
* 
* Định nghĩa bố cục chung cho các trang dành riêng cho Bác sĩ.
*
* Giao diện bao gồm một thanh menu bên trái để chuyển đổi giữa các trang "Hàng chờ khám" và "Hồ sơ bệnh án",
* cùng với một khu vực chính để hiển thị nội dung của từng trang tương ứng.
*/

import { useDispatch, useSelector } from 'react-redux'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { logout } from '../../store/slices/authSlice'

/* 
 * Cấu hình các mục trên thanh Menu điều hướng bên trái (Sidebar).
 * Mỗi mục có 'key' tương ứng với route URL để Ant Design Menu biết item nào đang được active.
*/
const NAV_ITEMS = [
  {
    label: 'Hàng chờ khám',
    to: '/doctor/dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: 'Hồ sơ bệnh án',
    to: '/doctor/emr',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
  },
]

// Component chính chứa toàn bộ bố cục của phân hệ Bác sĩ
export default function DoctorLayout() {
  const dispatch = useDispatch()
  const { user } = useSelector((s) => s.auth)

  /* 
  * Hàm xử lý sự kiện khi Bác sĩ nhấn nút "Đăng xuất"
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
        backgroundColor: '#fff',
        borderRight: '1px solid #e8eef4',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
      }}>
        {/* Brand */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              backgroundColor: '#0d9488',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* Stethoscope icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
                <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
                <circle cx="20" cy="10" r="2" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0d9488', lineHeight: 1.3 }}>Doctor</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0d9488', lineHeight: 1.3 }}>Portal</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Main Clinic Branch</div>
        </div>

        {/*  Khu vực Menu điều hướng. Bắt sự kiện onClick để chuyển route qua navigate() */}
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {NAV_ITEMS.map(({ label, to, icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                textDecoration: 'none', fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#0d9488' : '#64748b',
                backgroundColor: isActive ? '#ccfbf1' : 'transparent',
                transition: 'background-color 0.15s, color 0.15s',
              })}
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Khu vực thông tin User (Bác sĩ) và nút đăng xuất nằm ở cuối Sidebar */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
          <Link
            to="/"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 8, marginBottom: 6,
              fontSize: 12, color: '#64748b', textDecoration: 'none',
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
              {user?.fullName?.[0]?.toUpperCase() ?? 'D'}
            </div>
            <span style={{
              fontSize: 12, color: '#374151', fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.fullName ?? user?.email}
            </span>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%', background: 'none', border: '1px solid #e2e8f0',
              cursor: 'pointer', color: '#64748b', padding: '6px 0',
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
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
