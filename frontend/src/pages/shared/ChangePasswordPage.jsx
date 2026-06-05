// Mạnh Hùng - HE200743
// Trang đổi mật khẩu dành cho người dùng đã đăng nhập.
// Người dùng nhập mật khẩu hiện tại, mật khẩu mới và xác nhận.
// Có thanh hiển thị độ mạnh mật khẩu và icon ẩn/hiện mật khẩu.
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import authService from '../../services/authService'

// Hiển thị icon con mắt (mở hoặc đóng) để toggle ẩn/hiện mật khẩu trong ô nhập liệu
function EyeIcon({ visible }) {
  return visible ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

// Tính độ mạnh của mật khẩu dựa trên độ dài, chữ hoa, số và ký tự đặc biệt; trả về nhãn và màu hiển thị
function getStrength(password) {
  if (!password) return { label: 'Empty', color: '#94a3b8', width: 0 }
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return { label: 'Yếu', color: '#ef4444', width: 25 }
  if (score === 2) return { label: 'Trung bình', color: '#f97316', width: 50 }
  if (score === 3) return { label: 'Khá', color: '#eab308', width: 75 }
  return { label: 'Mạnh', color: '#22c55e', width: 100 }
}

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [show, setShow] = useState({ current: false, new: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const strength = getStrength(form.newPassword)

  // Cập nhật giá trị form khi người dùng nhập liệu, đồng thời xóa thông báo lỗi/thành công cũ
  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
    setSuccess('')
  }

  // Xử lý submit form: kiểm tra mật khẩu mới khớp nhau, gọi API đổi mật khẩu và hiển thị kết quả
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.newPassword !== form.confirmPassword) {
      setError('Mật khẩu mới và xác nhận mật khẩu không khớp')
      return
    }
    if (form.newPassword.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự')
      return
    }
    setLoading(true)
    setError('')
    try {
      await authService.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      })
      setSuccess('Đổi mật khẩu thành công!')
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Đổi mật khẩu thất bại')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 44px 10px 14px', borderRadius: 8,
    border: '1px solid #e2e8f0', fontSize: 14, color: '#374151',
    outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff',
    transition: 'border-color 0.15s',
  }
  const labelStyle = { fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>

      {/* Breadcrumb */}
      <div style={{ maxWidth: 860, margin: '32px auto 0', padding: '0 24px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
          <Link to="/profile" style={{ color: '#64748b', textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = '#1d4ed8'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
            Cài đặt
          </Link>
          <span>›</span>
          <span style={{ color: '#374151' }}>Bảo mật</span>
          <span>›</span>
          <span style={{ color: '#1d4ed8', fontWeight: 500 }}>Đổi mật khẩu</span>
        </div>
      </div>

      {/* Card */}
      <div style={{ maxWidth: 860, margin: '24px auto 0', padding: '0 24px', width: '100%', flex: 1 }}>
        <div style={{
          backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '40px 48px',
        }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
            Đổi mật khẩu
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 32px' }}>
            Tăng cường bảo mật tài khoản bằng cách chọn mật khẩu mạnh, độc đáo.
          </p>

          {error && (
            <div style={{
              backgroundColor: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '12px 16px', marginBottom: 20,
              color: '#dc2626', fontSize: 13,
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 8, padding: '12px 16px', marginBottom: 20,
              color: '#16a34a', fontSize: 13,
            }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Current Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Mật khẩu hiện tại</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={show.current ? 'text' : 'password'}
                  name="currentPassword"
                  placeholder="Nhập mật khẩu hiện tại"
                  value={form.currentPassword}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#1d4ed8'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <button type="button"
                  onClick={() => setShow(s => ({ ...s, current: !s.current }))}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                  <EyeIcon visible={show.current} />
                </button>
              </div>
            </div>

            {/* New Password */}
            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>Mật khẩu mới</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={show.new ? 'text' : 'password'}
                  name="newPassword"
                  placeholder="Tối thiểu 8 ký tự"
                  value={form.newPassword}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#1d4ed8'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <button type="button"
                  onClick={() => setShow(s => ({ ...s, new: !s.new }))}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                  <EyeIcon visible={show.new} />
                </button>
              </div>
            </div>

            {/* Password Strength */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Độ mạnh mật khẩu</span>
              <span style={{ fontSize: 12, color: strength.color, fontWeight: 600 }}>{strength.label}</span>
            </div>
            <div style={{ height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, marginBottom: 24, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${strength.width}%`, backgroundColor: strength.color, borderRadius: 2, transition: 'width 0.3s, background-color 0.3s' }} />
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: 32 }}>
              <label style={labelStyle}>Xác nhận mật khẩu mới</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={show.confirm ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Nhập lại mật khẩu mới"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#1d4ed8'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <button type="button"
                  onClick={() => setShow(s => ({ ...s, confirm: !s.confirm }))}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                  <EyeIcon visible={show.confirm} />
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" disabled={loading}
                style={{
                  backgroundColor: loading ? '#93c5fd' : '#1d4ed8', color: '#fff',
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  padding: '10px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#1e40af' }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#1d4ed8' }}>
                {loading ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
              </button>
              <button type="button" onClick={() => navigate(-1)}
                style={{
                  background: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer',
                  color: '#374151', padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 500,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0' }}>
                Hủy
              </button>
            </div>
          </form>
        </div>

        {/* Security Reminder */}
        <div style={{
          marginTop: 20, backgroundColor: '#eff6ff', border: '1px solid #dbeafe',
          borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start',
          marginBottom: 40,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8', margin: '0 0 4px' }}>Nhắc nhở bảo mật</p>
            <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>
              Đổi mật khẩu sẽ đăng xuất khỏi tất cả các thiết bị khác. Hãy sử dụng kết hợp chữ hoa, số và ký tự đặc biệt.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ backgroundColor: '#111827', color: '#9ca3af', padding: '24px', textAlign: 'center', fontSize: 13 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ color: '#fff', fontWeight: 600 }}>NHÃN KHOA ÁNH SAO</span>
          <span>© 2024 Eyes Clinic Management System. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Chính sách bảo mật', 'Điều khoản dịch vụ', 'Hỗ trợ'].map(t => (
              <a key={t} href="#" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 13 }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}>
                {t}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
