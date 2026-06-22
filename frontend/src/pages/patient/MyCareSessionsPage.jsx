import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { careSessionService } from '../../services/careSessionService'

const STATUS_INFO = {
  BOOKED: { label: 'Đã đặt', color: '#2563eb', bg: '#dbeafe' },
  IN_PROGRESS: { label: 'Đang thực hiện', color: '#d97706', bg: '#fef3c7' },
  COMPLETED: { label: 'Đã hoàn thành', color: '#16a34a', bg: '#dcfce7' },
  CHECKED_OUT: { label: 'Đã thanh toán', color: '#6b7280', bg: '#f3f4f6' },
  CANCELLED: { label: 'Đã huỷ', color: '#dc2626', bg: '#fee2e2' },
}

export default function MyCareSessionsPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)

  useEffect(() => {
    careSessionService.getMy().then(res => setSessions(res.data.data || [])).finally(() => setLoading(false))
  }, [])

  const handleCancel = async (id) => {
    if (!window.confirm('Huỷ buổi khám này?')) return
    setCancelling(id)
    try {
      await careSessionService.cancel(id)
      setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'CANCELLED' } : s))
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể huỷ')
    } finally {
      setCancelling(null)
    }
  }

  const formatDT = (dt) => {
    if (!dt) return ''
    const d = new Date(dt)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Buổi khám của tôi</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Lịch sử và lịch sắp tới</p>
          </div>
          <Link to="/patient/book-session" style={{ background: '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
            + Đặt buổi mới
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗓️</div>
            <p style={{ color: '#64748b', marginBottom: 24 }}>Chưa có buổi khám nào</p>
            <Link to="/patient/subscriptions" style={{ background: '#2563eb', color: '#fff', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
              Xem gói dịch vụ của tôi
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sessions.map(s => {
              const info = STATUS_INFO[s.status] || { label: s.status, color: '#6b7280', bg: '#f3f4f6' }
              return (
                <div key={s.id} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{s.serviceName}</span>
                      <span style={{ background: info.bg, color: info.color, padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>{info.label}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      Buổi {s.sessionNumber} • {formatDT(s.scheduledDateTime)}
                      {s.nurseName && <span> • ĐD: {s.nurseName}</span>}
                    </div>
                    {s.notes && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Ghi chú: {s.notes}</div>}
                  </div>
                  {s.status === 'BOOKED' && (
                    <button onClick={() => handleCancel(s.id)} disabled={cancelling === s.id}
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                      {cancelling === s.id ? '...' : 'Huỷ'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
