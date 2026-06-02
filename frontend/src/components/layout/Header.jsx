import { useState, useRef, useEffect } from 'react'
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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
              {user?.role === 'RECEPTIONIST' && (
                <button
                  onClick={() => navigate('/receptionist/appointments')}
                  style={{
                    backgroundColor: '#0f766e', color: '#fff',
                    border: 'none', cursor: 'pointer',
                    padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#0d6460' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0f766e' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  Quầy lễ tân
                </button>
              )}

              {user?.role === 'DOCTOR' && (
                <button
                  onClick={() => navigate('/doctor/dashboard')}
                  style={{
                    backgroundColor: '#0d9488', color: '#fff',
                    border: 'none', cursor: 'pointer',
                    padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#0f766e' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0d9488' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
                    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
                    <circle cx="20" cy="10" r="2" />
                  </svg>
                  Phòng khám
                </button>
              )}

              {/* User avatar dropdown */}
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'none', border: '1px solid #e2e8f0', cursor: 'pointer',
                    padding: '5px 10px 5px 5px', borderRadius: 10,
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    backgroundColor: '#1d4ed8', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <span style={{ fontSize: 13, color: '#374151', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.fullName ?? user?.email}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    backgroundColor: '#fff', border: '1px solid #e2e8f0',
                    borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                    minWidth: 200, zIndex: 100, overflow: 'hidden',
                  }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{user?.fullName}</p>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{user?.email}</p>
                    </div>
                    {[
                      { label: 'Hồ sơ cá nhân', to: '/profile', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
                      { label: 'Đổi mật khẩu', to: '/change-password', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
                    ].map(item => (
                      <Link key={item.to} to={item.to}
                        onClick={() => setDropdownOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 16px', fontSize: 13, color: '#374151',
                          textDecoration: 'none', transition: 'background-color 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <span style={{ color: '#64748b' }}>{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                    <div style={{ borderTop: '1px solid #f1f5f9' }}>
                      <button onClick={() => { setDropdownOpen(false); handleLogout() }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          width: '100%', padding: '10px 16px', fontSize: 13, color: '#dc2626',
                          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                          transition: 'background-color 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
