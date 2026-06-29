import { useEffect, useRef, useState } from 'react'
import { doctorService } from '../../services/doctorService'

export default function ManageDoctorsPage() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploadingId, setUploadingId] = useState(null)
  const fileInputRefs = useRef({})

  const fetchDoctors = async () => {
    setLoading(true)
    try {
      const res = await doctorService.getAllDoctors()
      setDoctors(res.data || [])
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchDoctors() }, [])

  const handleAvatarUpload = async (doctorId, file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('File phải là ảnh'); return }
    setUploadingId(doctorId)
    setError('')
    try {
      const uploadRes = await doctorService.uploadAvatar(file)
      const url = uploadRes.data?.url || ''
      await doctorService.updateAvatar(doctorId, url)
      await fetchDoctors()
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi tải ảnh')
    } finally {
      setUploadingId(null)
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Quản lý bác sĩ</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Cập nhật ảnh đại diện hiển thị ở trang đặt lịch khám</p>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Ảnh', 'Bác sĩ', 'Chuyên khoa', 'Khoa', 'Kinh nghiệm', 'Thao tác'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doctors.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Không có bác sĩ nào</td></tr>
              )}
              {doctors.map((d, i) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, background: '#eef2ff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, overflow: 'hidden',
                    }}>
                      {d.avatarUrl
                        ? <img src={d.avatarUrl} alt={d.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : '👨‍⚕️'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e293b' }}>{d.fullName}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{d.specialization || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{d.department || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>
                    {d.experienceYears != null ? `${d.experienceYears} năm` : '—'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <input
                      ref={el => { fileInputRefs.current[d.id] = el }}
                      type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => handleAvatarUpload(d.id, e.target.files?.[0])}
                    />
                    <button
                      onClick={() => fileInputRefs.current[d.id]?.click()}
                      disabled={uploadingId === d.id}
                      style={{
                        background: '#eff6ff', color: '#2563eb', border: 'none', padding: '6px 12px',
                        borderRadius: 6, cursor: uploadingId === d.id ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600,
                      }}
                    >
                      {uploadingId === d.id ? 'Đang tải...' : 'Đổi ảnh'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
