import { useDispatch, useSelector } from 'react-redux'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { logout } from '../../store/slices/authSlice'
import logoImg from '../../assets/ECMS_Logo.png'

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    to: '/receptionist/appointments',
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
    label: 'Lịch khám vãng lai',
    to: '/receptionist/walk-in-appointment',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    label: 'Đăng ký bệnh nhân',
    to: '/receptionist/walk-in',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
  },
  {
    label: 'Lịch khám (Calendar)',
    to: '/receptionist/daily-schedule',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: 'Check-out buổi khám',
    to: '/receptionist/checkout-care-sessions',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
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
              backgroundColor: '#1d4ed8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1d4ed8', lineHeight: 1.3 }}>Reception</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1d4ed8', lineHeight: 1.3 }}>Desk</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Main Clinic Branch</div>
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
                textDecoration: 'none', fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#1d4ed8' : '#64748b',
                backgroundColor: isActive ? '#eff6ff' : 'transparent',
                transition: 'background-color 0.15s, color 0.15s',
              })}
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
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
              backgroundColor: '#1d4ed8', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <span style={{ fontSize: 12, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
