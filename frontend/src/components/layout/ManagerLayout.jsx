import { useDispatch, useSelector } from 'react-redux'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { FiGrid, FiDollarSign, FiBarChart2, FiActivity, FiStar, FiCreditCard, FiCalendar, FiBox, FiUsers, FiTag, FiUserPlus, FiRefreshCw, FiEye, FiLogOut, FiFileText, FiHome } from 'react-icons/fi'
import { logout } from '../../store/slices/authSlice'
import NotificationBell from './NotificationBell'
import Header from './Header'

const ACCENT = '#7c3aed'
const SIDEBAR_BG = '#1c1b1f'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/manager/dashboard', Icon: FiGrid },
  { label: 'Báo cáo doanh thu', to: '/manager/revenue', Icon: FiDollarSign },
  { label: 'Thống kê bệnh nhân', to: '/manager/patient-statistics', Icon: FiBarChart2 },
  { label: 'Hiệu suất nhân viên', to: '/manager/staff', Icon: FiActivity },
  { label: 'Báo cáo đánh giá', to: '/manager/feedback-report', Icon: FiStar },
  { label: 'Bảng lương', to: '/manager/payroll', Icon: FiCreditCard },
  { label: 'Lịch khám', to: '/manager/daily-schedule', Icon: FiCalendar },
  { label: 'Gói dịch vụ', to: '/manager/service-packages', Icon: FiBox },
  { label: 'Quản lý bài viết', to: '/manager/blogs', Icon: FiFileText },
  { label: 'Quản lý bác sĩ', to: '/manager/doctors', Icon: FiUsers },
  { label: 'Chương trình giảm giá', to: '/manager/discount-campaigns', Icon: FiTag },
  { label: 'Phân công điều dưỡng', to: '/manager/assign-nurse', Icon: FiUserPlus },
  { label: 'Chuyển lịch hẹn', to: '/manager/reassign-appointment', Icon: FiRefreshCw },
]

export default function ManagerLayout() {
  const dispatch = useDispatch()
  const { user } = useSelector((s) => s.auth)

  const handleLogout = () => {
    dispatch(logout())
    window.location.href = '/'
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f5f6ff' }}>
      {/* ── Sidebar (dark) ── */}
      <aside style={{
        width: 250, flexShrink: 0, backgroundColor: SIDEBAR_BG,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Brand */}
        <div style={{ padding: '22px 22px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, backgroundColor: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiEye size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#fff', lineHeight: 1.2 }}>Quản lý</div>
              <div style={{ fontWeight: 600, fontSize: 12, color: ACCENT }}>Phòng khám</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 16 }}>Main Clinic Branch</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(({ label, to, Icon }) => (
            <NavLink key={to} to={to} end
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 16px', borderRadius: 10, marginBottom: 4,
                textDecoration: 'none', fontSize: 14, fontWeight: 500,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                background: isActive ? 'linear-gradient(90deg,#7c3aed 0%,#a78bfa 100%)' : 'transparent',
                boxShadow: isActive ? '0 8px 18px rgba(124,58,237,0.35)' : 'none',
              })}>
              <Icon size={18} style={{ flexShrink: 0 }} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Link
            to="/"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 6px', borderRadius: 8, marginBottom: 6,
              fontSize: 12, color: 'rgba(255,255,255,0.6)', textDecoration: 'none',
            }}
          >
            <FiHome size={14} />
            Về trang chủ
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'rgba(167,139,250,0.3)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                {user?.fullName?.[0]?.toUpperCase() ?? 'M'}
              </div>
              <span style={{ fontSize: 13, color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                {user?.fullName ?? user?.email}
              </span>
            </div>
            <NotificationBell viewAllPath="/manager/dashboard" />
          </div>

          <button onClick={handleLogout} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: '8px 6px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <FiLogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      {/* scrollbarGutter: 'stable' để header (canh giữa theo main) không bị lệch vài px giữa các trang có/không có thanh cuộn dọc */}
      <main style={{ flex: 1, overflow: 'auto', scrollbarGutter: 'stable' }}>
        <Header />
        <Outlet />
      </main>
    </div>
  )
}
