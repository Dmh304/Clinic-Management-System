import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { subscriptionService } from '../../services/subscriptionService'
import { careSessionService } from '../../services/careSessionService'

export default function BookCareSessionPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const preselectedId = searchParams.get('subscriptionId')
  const [subscriptions, setSubscriptions] = useState([])
  const [selectedSub, setSelectedSub] = useState(preselectedId || '')
  const [scheduledDateTime, setScheduledDateTime] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    subscriptionService.getMy().then(res => {
      const active = (res.data.data || []).filter(s => s.status === 'ACTIVE' && s.remainingSessions > 0)
      setSubscriptions(active)
    }).catch(() => setError('Không thể tải danh sách gói')).finally(() => setLoading(false))
  }, [])

  const selected = subscriptions.find(s => String(s.id) === String(selectedSub))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedSub) return setError('Vui lòng chọn gói đăng ký')
    if (!scheduledDateTime) return setError('Vui lòng chọn ngày giờ')
    setSubmitting(true)
    setError('')
    try {
      await careSessionService.book({
        subscriptionId: Number(selectedSub),
        scheduledDateTime: scheduledDateTime.replace('T', 'T'),
        notes,
      })
      alert('Đặt buổi khám thành công!')
      navigate('/patient/care-sessions')
    } catch (err) {
      setError(err.response?.data?.message || 'Đặt lịch thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 14, marginBottom: 16, padding: 0 }}>
          ← Quay lại
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>Đặt buổi khám</h1>
        <p style={{ color: '#64748b', margin: '0 0 24px', fontSize: 14 }}>Chọn gói và thời gian phù hợp</p>

        {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>{error}</div>}

        {subscriptions.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p style={{ color: '#64748b', marginBottom: 16 }}>Không có gói dịch vụ đang hoạt động nào</p>
            <button onClick={() => navigate('/services')} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              Mua gói dịch vụ
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#374151', fontSize: 14 }}>Gói dịch vụ *</label>
              <select value={selectedSub} onChange={e => setSelectedSub(e.target.value)} required
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' }}>
                <option value="">-- Chọn gói --</option>
                {subscriptions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.serviceName} — Còn {s.remainingSessions}/{s.totalSessions} buổi
                  </option>
                ))}
              </select>
              {selected && (
                <div style={{ marginTop: 8, background: '#eff6ff', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
                  <div style={{ color: '#1e40af', fontWeight: 600 }}>{selected.serviceName}</div>
                  <div style={{ color: '#3b82f6', marginTop: 2 }}>Còn {selected.remainingSessions} buổi • Hết hạn: {selected.expiryDate || 'Không giới hạn'}</div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#374151', fontSize: 14 }}>Ngày & Giờ khám *</label>
              <input type="datetime-local" value={scheduledDateTime} onChange={e => setScheduledDateTime(e.target.value)} required
                min={new Date().toISOString().slice(0, 16)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#374151', fontSize: 14 }}>Ghi chú</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Triệu chứng, yêu cầu đặc biệt..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <button type="submit" disabled={submitting}
              style={{ width: '100%', background: submitting ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Đang xử lý...' : 'Xác nhận đặt lịch'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
