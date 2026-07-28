import { useDispatch, useSelector } from 'react-redux'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { FiCalendar, FiZap, FiUserPlus, FiBell, FiCheckSquare, FiFileText, FiCreditCard, FiMessageCircle, FiEye, FiHome, FiLogOut } from 'react-icons/fi'
import { FaGlasses } from 'react-icons/fa'
import { logout } from '../../store/slices/authSlice'
import Header from './Header'
import logoImg from '../../assets/ECMS_Logo.png'

const NAV_ITEMS = [
  // Đối soát & Hoàn tiền nằm trong tab của "Hóa đơn & Thu phí"; route
  // /receptionist/reconciliation vẫn giữ để link cũ không gãy.
  { label: 'Dashboard', to: '/receptionist/appointments', icon: <FiCalendar size={16} /> },
  { label: 'Lịch khám vãng lai', to: '/receptionist/walk-in-appointment', icon: <FiZap size={16} /> },
  { label: 'Tạo tài khoản bệnh nhân', to: '/receptionist/walk-in', icon: <FiUserPlus size={16} /> },
  { label: 'Thông báo', to: '/receptionist/notifications', icon: <FiBell size={16} /> },
  { label: 'Check-out dịch vụ', to: '/receptionist/checkout-care-sessions', icon: <FiCheckSquare size={16} /> },
  { label: 'Đăng ký dịch vụ', to: '/receptionist/service-registrations', icon: <FiFileText size={16} /> },
  { label: 'Hóa đơn & Thu phí', to: '/receptionist/invoice', icon: <FiCreditCard size={16} /> },
  { label: 'Quản lý Đơn Kính', to: '/receptionist/eyeglass-orders', icon: <FaGlasses size={16} /> },
  { label: 'Hỗ trợ trực tuyến', to: '/receptionist/support', icon: <FiMessageCircle size={16} /> },
]

export default function ReceptionistLayout() {
  const dispatch = useDispatch()
  const { user } = useSelector((s) => s.auth)

  const handleLogout = () => {
    dispatch(logout())
    window.location.href = '/'
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f0f4ff' }}>
      {/* ── Sidebar ── */}
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
              backgroundColor: '#1d4ed8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FiEye size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#ffffffff', lineHeight: 1.3 }}>Reception Desk</div>

            </div>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Main Clinic Branch</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {NAV_ITEMS.map(({ label, to, icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                textDecoration: 'none', fontSize: 14,
                fontWeight: 500,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                backgroundColor: isActive ? '#2ebe79ff' : 'transparent',
                transition: 'background-color 0.15s, color 0.15s',
              })}
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Link
            to="/"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 8, marginBottom: 6,
              fontSize: 12, color: 'rgba(255,255,255,0.6)', textDecoration: 'none',
            }}
          >
            <FiHome size={14} />
            Về trang chủ
          </Link>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', marginBottom: 6,
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              backgroundColor: '#1d4ed8', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <span style={{ flex: 1, fontSize: 12, color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.fullName ?? user?.email}
            </span>

          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%', background: 'none', border: '1px solid rgba(255,255,255,0.15)',
              cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: '6px 0',
              borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
            }}
          >
            <FiLogOut size={13} />
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
