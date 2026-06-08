// Mạnh Hùng - HE200743
// Trang hồ sơ cá nhân dành cho người dùng đã đăng nhập.
// Hiển thị avatar, họ tên, email, vai trò và thông tin chi tiết (SĐT, ngày sinh, giới tính, địa chỉ).
// Người dùng có thể chỉnh sửa thông tin và lưu lại, hoặc truy cập nhanh trang đổi mật khẩu.
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { updateUser } from '../../store/slices/authSlice'
import userService from '../../services/userService'

const GENDER_OPTIONS = [
  { value: '', label: 'Chọn giới tính' },
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'OTHER', label: 'Khác' },
]

// Component hiển thị một trường thông tin có nhãn, dùng trong form hồ sơ
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// Trả về style cho ô input tùy theo chế độ chỉ đọc hay chỉnh sửa
const inputStyle = (readOnly) => ({
  width: '100%', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box',
  border: `1px solid ${readOnly ? '#e2e8f0' : '#e2e8f0'}`,
  backgroundColor: readOnly ? '#f8fafc' : '#fff',
  fontSize: 14, fontWeight: readOnly ? 500 : 400, color: readOnly ? '#1e293b' : '#374151',
  outline: 'none', transition: 'border-color 0.15s',
  cursor: readOnly ? 'default' : 'text',
})

// Hiển thị giá trị dạng văn bản (dùng khi không ở chế độ chỉnh sửa) thay vì ô input
// để thông tin luôn hiện rõ ràng, dễ đọc thay vì trông như ô trống
function ReadOnlyValue({ value, placeholder }) {
  const hasValue = value !== null && value !== undefined && value !== ''
  return (
    <div style={{
      width: '100%', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box',
      border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
      fontSize: 14, fontWeight: hasValue ? 500 : 400,
      color: hasValue ? '#1e293b' : '#94a3b8',
      minHeight: 38, display: 'flex', alignItems: 'center',
    }}>
      {hasValue ? value : (placeholder || 'Chưa cập nhật')}
    </div>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { user } = useSelector(s => s.auth)

  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({})
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Tải thông tin hồ sơ từ server khi component được mount lần đầu
  useEffect(() => {
    userService.getProfile()
      .then(data => {
        setProfile(data)
        setForm({
          fullName: data.fullName || '',
          phone: data.phone || '',
          dateOfBirth: data.dateOfBirth || '',
          gender: data.gender || '',
          address: data.address || '',
        })
      })
      .catch(err => setError(err?.message || 'Không thể tải thông tin hồ sơ'))
      .finally(() => setLoading(false))
  }, [])

  // Cập nhật giá trị form khi người dùng thay đổi nội dung ô nhập liệu
  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
    setSuccess('')
  }

  // Lưu thay đổi hồ sơ: gọi API cập nhật, cập nhật state local và thoát chế độ chỉnh sửa
  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const updated = await userService.updateProfile({
        fullName: form.fullName || undefined,
        phone: form.phone || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        address: form.address || undefined,
      })
      setProfile(updated)
      // Đồng bộ lại tên/SĐT trong Redux + localStorage để Header và các nơi khác
      // hiển thị đúng dữ liệu mới mà không cần đăng nhập lại
      dispatch(updateUser({ fullName: updated.fullName, phone: updated.phone }))
      setSuccess('Cập nhật hồ sơ thành công!')
      setEditing(false)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Cập nhật thất bại')
    } finally {
      setSaving(false)
    }
  }

  // Hủy chỉnh sửa: khôi phục form về giá trị hồ sơ hiện tại và thoát chế độ chỉnh sửa
  const handleCancel = () => {
    setForm({
      fullName: profile?.fullName || '',
      phone: profile?.phone || '',
      dateOfBirth: profile?.dateOfBirth || '',
      gender: profile?.gender || '',
      address: profile?.address || '',
    })
    setEditing(false)
    setError('')
    setSuccess('')
  }

  const avatarLetter = (profile?.fullName || user?.fullName || 'U')[0].toUpperCase()

  const isPatient = profile?.role === 'PATIENT'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>

      {/* Breadcrumb */}
      <div style={{ maxWidth: 860, margin: '32px auto 0', padding: '0 24px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
          <span style={{ color: '#1d4ed8', fontWeight: 500 }}>Hồ sơ cá nhân</span>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '24px auto 0', padding: '0 24px', width: '100%', flex: 1 }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>Đang tải...</div>
        ) : (
          <>
            {/* Avatar + Name card */}
            <div style={{
              backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '28px 40px',
              display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16,
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1d4ed8, #0f766e)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 700, flexShrink: 0,
              }}>
                {avatarLetter}
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
                  {profile?.fullName || user?.fullName}
                </h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{profile?.email || user?.email}</p>
                <span style={{
                  display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 700,
                  backgroundColor: '#dbeafe', color: '#1d4ed8',
                  padding: '2px 10px', borderRadius: 999, letterSpacing: 0.5,
                }}>
                  {profile?.role}
                </span>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                {!editing ? (
                  <button onClick={() => setEditing(true)}
                    style={{
                      backgroundColor: '#1d4ed8', color: '#fff', border: 'none',
                      cursor: 'pointer', padding: '8px 20px', borderRadius: 8,
                      fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1e40af'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1d4ed8'}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Chỉnh sửa
                  </button>
                ) : null}
              </div>
            </div>

            {/* Info card */}
            <div style={{
              backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '36px 40px',
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 24px', paddingBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
                Thông tin cá nhân
              </h3>

              {error && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: 13 }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#16a34a', fontSize: 13 }}>
                  {success}
                </div>
              )}

              <form onSubmit={handleSave}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                  <Field label="Họ và tên">
                    {editing ? (
                      <input
                        name="fullName" value={form.fullName} onChange={handleChange}
                        required
                        style={inputStyle(false)}
                        onFocus={e => { e.target.style.borderColor = '#1d4ed8' }}
                        onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
                      />
                    ) : (
                      <ReadOnlyValue value={profile?.fullName} />
                    )}
                  </Field>

                  <Field label="Email">
                    <ReadOnlyValue value={profile?.email} />
                  </Field>

                  <Field label="Số điện thoại">
                    {editing ? (
                      <input
                        name="phone" value={form.phone} onChange={handleChange}
                        placeholder="Chưa cập nhật"
                        style={inputStyle(false)}
                        onFocus={e => { e.target.style.borderColor = '#1d4ed8' }}
                        onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
                      />
                    ) : (
                      <ReadOnlyValue value={profile?.phone} />
                    )}
                  </Field>

                  {isPatient && (
                    <Field label="Ngày sinh">
                      {editing ? (
                        <input
                          type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange}
                          style={inputStyle(false)}
                          onFocus={e => { e.target.style.borderColor = '#1d4ed8' }}
                          onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
                        />
                      ) : (
                        <ReadOnlyValue value={profile?.dateOfBirth} />
                      )}
                    </Field>
                  )}

                  {isPatient && (
                    <Field label="Giới tính">
                      {editing ? (
                        <select name="gender" value={form.gender} onChange={handleChange}
                          style={{ ...inputStyle(false), cursor: 'pointer' }}>
                          {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      ) : (
                        <ReadOnlyValue value={GENDER_OPTIONS.find(o => o.value === profile?.gender)?.label} />
                      )}
                    </Field>
                  )}
                </div>

                {isPatient && (
                  <Field label="Địa chỉ">
                    {editing ? (
                      <input
                        name="address" value={form.address} onChange={handleChange}
                        placeholder="Chưa cập nhật"
                        style={inputStyle(false)}
                        onFocus={e => { e.target.style.borderColor = '#1d4ed8' }}
                        onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
                      />
                    ) : (
                      <ReadOnlyValue value={profile?.address} />
                    )}
                  </Field>
                )}

                {editing && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <button type="submit" disabled={saving}
                      style={{
                        backgroundColor: saving ? '#93c5fd' : '#1d4ed8', color: '#fff',
                        border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                        padding: '10px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                      }}
                      onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = '#1e40af' }}
                      onMouseLeave={e => { if (!saving) e.currentTarget.style.backgroundColor = '#1d4ed8' }}>
                      {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                    <button type="button" onClick={handleCancel}
                      style={{
                        background: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer',
                        color: '#374151', padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 500,
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                      Hủy
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Change password shortcut */}
            <div style={{
              marginTop: 16, backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '20px 40px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 40,
            }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>Bảo mật tài khoản</p>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Thay đổi mật khẩu định kỳ để bảo vệ tài khoản</p>
              </div>
              <Link to="/change-password"
                style={{
                  backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe',
                  padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#dbeafe'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#eff6ff'}>
                Đổi mật khẩu
              </Link>
            </div>
          </>
        )}
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
