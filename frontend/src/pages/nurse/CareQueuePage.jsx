import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { careSessionService } from '../../services/careSessionService'

const STATUS_INFO = {
  BOOKED: { label: 'Chờ khám', color: '#2563eb', bg: '#dbeafe' },
  IN_PROGRESS: { label: 'Đang khám', color: '#ea580c', bg: '#ffedd5' },
  COMPLETED: { label: 'Hoàn thành', color: '#16a34a', bg: '#dcfce7' },
  CHECKED_OUT: { label: 'Đã trả', color: '#16a34a', bg: '#dcfce7' },
  CANCELLED: { label: 'Đã huỷ', color: '#dc2626', bg: '#fee2e2' },
}

// Chỉ những buổi còn thao tác được (chưa bắt đầu / đang khám dở) mới cho vào trang thực hiện
const ACTIONABLE_STATUSES = new Set(['BOOKED', 'IN_PROGRESS'])

// UC-31 POST-1: "queue refreshed in real time" — polling nhẹ, cùng chu kỳ với chuông
// thông báo (NotificationBell) trong hệ thống, không dùng websocket.
const POLL_INTERVAL_MS = 30000

export default function CareQueuePage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [anchorDate, setAnchorDate] = useState(dayjs().startOf('day'))
  const navigate = useNavigate()

  const fetchQueue = async (date = anchorDate, { silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const res = await careSessionService.getQueue(date.format('YYYY-MM-DD'))
      setSessions(res.data || [])
    } catch {
      if (!silent) setError('Không thể tải hàng đợi')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQueue(anchorDate)
    // Chỉ polling khi đang xem đúng ngày hôm nay — xem ngày khác thì dữ liệu tĩnh, không cần.
    if (!anchorDate.isSame(dayjs(), 'day')) return
    const timer = setInterval(() => fetchQueue(anchorDate, { silent: true }), POLL_INTERVAL_MS)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorDate])

  const goToday = () => {
    const today = dayjs().startOf('day')
    if (today.isSame(anchorDate, 'day')) fetchQueue(today) // đã ở hôm nay → ép tải lại
    else setAnchorDate(today)
  }
  const goPrev = () => setAnchorDate(d => d.subtract(1, 'day'))
  const goNext = () => setAnchorDate(d => d.add(1, 'day'))

  const isToday = anchorDate.isSame(dayjs(), 'day')
  const dateTitle = anchorDate.toDate().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const formatTime = (dt) => {
    if (!dt) return ''
    const d = new Date(dt)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const waitingCount = sessions.filter(s => s.status === 'BOOKED').length

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Hàng đợi buổi khám</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Xem buổi khám được phân công cho bạn theo từng ngày</p>
        </div>

        {/* Thanh điều hướng ngày — cùng khuôn với Lịch khám của lễ tân */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
              <button onClick={goPrev} style={{ padding: '8px 12px', border: 'none', background: '#fff', cursor: 'pointer', borderRight: '1px solid #e2e8f0' }}>‹</button>
              <button onClick={goToday} style={{ padding: '8px 14px', border: 'none', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#2563eb', borderRight: '1px solid #e2e8f0' }}>Hôm nay</button>
              <button onClick={goNext} style={{ padding: '8px 12px', border: 'none', background: '#fff', cursor: 'pointer' }}>›</button>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>
              {isToday ? `Hôm nay — ${dateTitle}` : dateTitle}
            </span>
          </div>

          <button onClick={() => fetchQueue()} disabled={loading}
            style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: 8, cursor: loading ? 'default' : 'pointer', fontWeight: 600, fontSize: 13, color: '#374151' }}>
            {loading ? 'Đang tải...' : '↻ Làm mới'}
          </button>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div style={{ background: '#dbeafe', borderRadius: 10, padding: '12px 20px', flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#2563eb' }}>{waitingCount}</div>
            <div style={{ fontSize: 13, color: '#1d4ed8' }}>Buổi chờ khám</div>
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: 10, padding: '12px 20px', flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#475569' }}>{sessions.length}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Tổng buổi trong ngày</div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>
        ) : sessions.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p style={{ color: '#64748b' }}>Không có buổi khám nào trong ngày này</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sessions.map((s, idx) => {
              const info = STATUS_INFO[s.status] || { label: s.status, color: '#6b7280', bg: '#f3f4f6' }
              return (
                <div key={s.id} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, background: '#dbeafe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#2563eb', flexShrink: 0 }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{s.patientName}</div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>
                        {s.serviceName} • Buổi {s.sessionNumber}/{s.totalSessions} • {formatTime(s.scheduledDateTime)}
                        {s.durationMinutes != null && ` • ${s.durationMinutes} phút`}
                      </div>
                      {s.notes && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Ghi chú: {s.notes}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {s.isIncident && (
                      <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>⚠️ Sự cố</span>
                    )}
                    {s.status === 'BOOKED' && !s.checkedIn && (
                      <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>Chưa check-in</span>
                    )}
                    <span style={{ background: info.bg, color: info.color, padding: '4px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>{info.label}</span>
                    {ACTIONABLE_STATUSES.has(s.status) && (
                      s.status === 'BOOKED' && !s.checkedIn ? (
                        <button disabled
                          title="Bệnh nhân cần check-in tại quầy lễ tân trước"
                          style={{ background: '#e2e8f0', color: '#94a3b8', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'not-allowed', fontWeight: 700, fontSize: 14 }}>
                          Chờ check-in
                        </button>
                      ) : (
                        <button onClick={() => navigate(`/nurse/deliver/${s.id}`)}
                          style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                          {s.status === 'IN_PROGRESS' ? 'Tiếp tục' : 'Bắt đầu khám'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
