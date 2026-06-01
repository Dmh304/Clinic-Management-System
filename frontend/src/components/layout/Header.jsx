import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { logout } from '../../store/slices/authSlice'
import logoImg from '../../assets/ECMS_Logo.png'

const PROTECTED_GUEST_ROUTES = {
  'Đặt lịch': '/patient/booking',
  'Hồ sơ bệnh án': '/patient/history',
}

const PUBLIC_LINKS = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Blog', to: '/blogs' },
  { label: 'Hỗ trợ', to: '/support' },
]

export default function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isAuthenticated, user } = useSelector((s) => s.auth)

  const handleProtectedLink = (targetPath) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: targetPath } })
    } else {
      navigate(targetPath)
    }
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/', { replace: true })
  }

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      backgroundColor: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid #f1f5f9',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64,
      }}>
        {/* Logo */}
        <Link to="/" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontWeight: 700, fontSize: 17, color: '#1d4ed8',
          textDecoration: 'none',
        }}>
          <img src={logoImg} alt="Anh Sao Eye Clinic" style={{ height: 44, width: 'auto' }} />
          NHÃN KHOA ÁNH SAO
        </Link>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {PUBLIC_LINKS.map(({ label, to }) => {
            const active = pathname === to
            return (
              <Link key={to} to={to} style={{
                fontSize: 14, textDecoration: 'none',
                color: active ? '#1d4ed8' : '#64748b',
                fontWeight: active ? 600 : 400,
                borderBottom: active ? '2px solid #1d4ed8' : '2px solid transparent',
                paddingBottom: 2,
                transition: 'color 0.15s',
              }}>
                {label}
              </Link>
            )
          })}

          {Object.entries(PROTECTED_GUEST_ROUTES).map(([label, path]) => {
            const active = pathname.startsWith(path)
            return (
              <button
                key={label}
                onClick={() => handleProtectedLink(path)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontSize: 14,
                  color: active ? '#1d4ed8' : '#64748b',
                  fontWeight: active ? 600 : 400,
                  borderBottom: active ? '2px solid #1d4ed8' : '2px solid transparent',
                  paddingBottom: 2,
                  transition: 'color 0.15s',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {label}
                {!isAuthenticated && (
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>🔒</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isAuthenticated ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  backgroundColor: '#1d4ed8', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, flexShrink: 0,
                }}>
                  {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <span style={{ fontSize: 13, color: '#374151', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.fullName ?? user?.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  background: 'none', border: '1px solid #e2e8f0', cursor: 'pointer',
                  color: '#64748b', padding: '6px 14px', borderRadius: 8, fontSize: 13,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#374151' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b' }}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                state={{ from: pathname }}
                style={{
                  color: '#1d4ed8', border: '1px solid #dbeafe',
                  backgroundColor: '#eff6ff',
                  padding: '7px 18px', borderRadius: 8,
                  fontSize: 14, fontWeight: 500, textDecoration: 'none',
                  transition: 'background-color 0.15s',
                }}
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                style={{
                  backgroundColor: '#1d4ed8', color: '#fff',
                  padding: '8px 18px', borderRadius: 8,
                  fontSize: 14, fontWeight: 500, textDecoration: 'none',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1e40af'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1d4ed8'}
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
