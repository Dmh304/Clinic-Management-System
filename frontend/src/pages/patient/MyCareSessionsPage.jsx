import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiChevronDown, FiChevronUp, FiUser, FiMapPin, FiClock, FiEdit3 } from 'react-icons/fi'
import { careSessionService } from '../../services/careSessionService'
import { subscriptionService } from '../../services/subscriptionService'

const STATUS_INFO = {
  BOOKED: { label: 'Đã đặt', color: '#2563eb', bg: '#dbeafe' },
  IN_PROGRESS: { label: 'Đang thực hiện', color: '#d97706', bg: '#fef3c7' },
  COMPLETED: { label: 'Đã hoàn thành', color: '#16a34a', bg: '#dcfce7' },
  CHECKED_OUT: { label: 'Đã thanh toán', color: '#6b7280', bg: '#f3f4f6' },
  CANCELLED: { label: 'Đã huỷ', color: '#dc2626', bg: '#fee2e2' },
}

const formatDT = (dt) => {
  if (!dt) return ''
  const d = new Date(dt)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

// Chi tiết 1 buổi khi bấm mở rộng — chỉ hiển thị dữ liệu THẬT đã có sẵn (không bịa thêm
// mục "bài tập về nhà" tách riêng vì backend chưa có trường này; điều dưỡng ghi hướng dẫn/
// bài tập luyện mắt chung vào nurseNotes sau khi hoàn thành buổi, nên hiển thị đúng trường đó).
function SessionDetail({ session }) {
  return (
    <div style={{ padding: '0 20px 16px', borderTop: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12, fontSize: 13, color: '#475569' }}>
        {session.nurseName && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FiUser size={13} /> Điều dưỡng: {session.nurseName}
          </span>
        )}
        {session.roomName && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FiMapPin size={13} /> Phòng: {session.roomName}
          </span>
        )}
        {session.durationMinutes != null && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FiClock size={13} /> Thời lượng thực tế: {session.durationMinutes} phút
          </span>
        )}
      </div>

      {session.notes && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Ghi chú của bạn lúc đặt lịch</div>
          <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>{session.notes}</div>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FiEdit3 size={12} /> Ghi chú & hướng dẫn từ điều dưỡng
        </div>
        {session.nurseNotes ? (
          <div style={{ fontSize: 13, color: '#334155', marginTop: 4, background: '#f8fafc', borderRadius: 8, padding: '10px 12px', whiteSpace: 'pre-wrap' }}>
            {session.nurseNotes}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
            {session.status === 'BOOKED' || session.status === 'IN_PROGRESS'
              ? 'Buổi chưa hoàn thành, điều dưỡng chưa ghi chú.'
              : 'Không có ghi chú cho buổi này.'}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MyCareSessionsPage() {
  const { subscriptionId } = useParams()
  const [subscription, setSubscription] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    const loadSessions = subscriptionId
      ? careSessionService.getBySubscription(subscriptionId)
      : careSessionService.getMy()
    const loadSubscription = subscriptionId
      ? subscriptionService.getById(subscriptionId)
      : Promise.resolve(null)

    Promise.all([loadSessions, loadSubscription])
      .then(([sessionsRes, subRes]) => {
        setSessions(sessionsRes.data || [])
        if (subRes) setSubscription(subRes.data || null)
      })
      .finally(() => setLoading(false))
  }, [subscriptionId])

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

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  const pageTitle = subscription ? subscription.serviceName : 'Buổi khám của tôi'
  const pageSubtitle = subscription
    ? `Lịch sử và lịch sắp tới • Còn ${subscription.remainingSessions}/${subscription.totalSessions} buổi`
    : 'Lịch sử và lịch sắp tới'

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {subscriptionId && (
          <Link to="/patient/subscriptions" style={{ color: '#2563eb', fontSize: 13, textDecoration: 'none', display: 'inline-block', marginBottom: 12 }}>
            ← Quay lại Dịch vụ của tôi
          </Link>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>{pageTitle}</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>{pageSubtitle}</p>
          </div>
          <Link
            to={subscriptionId ? `/patient/book-session?subscriptionId=${subscriptionId}` : '/patient/book-session'}
            style={{ background: '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
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
              const expanded = expandedId === s.id
              return (
                <div key={s.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedId(expanded ? null : s.id)}
                    style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, cursor: 'pointer' }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{subscription ? `Buổi ${s.sessionNumber}` : s.serviceName}</span>
                        <span style={{ background: info.bg, color: info.color, padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>{info.label}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>
                        {!subscription && <>Buổi {s.sessionNumber} • </>}{formatDT(s.scheduledDateTime)}
                        {s.nurseName && <span> • ĐD: {s.nurseName}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {s.status === 'BOOKED' && (
                        <button onClick={(e) => { e.stopPropagation(); handleCancel(s.id) }} disabled={cancelling === s.id}
                          style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                          {cancelling === s.id ? '...' : 'Huỷ'}
                        </button>
                      )}
                      {expanded ? <FiChevronUp color="#94a3b8" /> : <FiChevronDown color="#94a3b8" />}
                    </div>
                  </div>
                  {expanded && <SessionDetail session={s} />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
