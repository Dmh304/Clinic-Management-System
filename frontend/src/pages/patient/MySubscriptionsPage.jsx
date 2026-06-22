import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscriptionService } from '../../services/subscriptionService'
import { serviceService } from '../../services/serviceService'

const STATUS_LABEL = {
  ACTIVE: { label: 'Đang hoạt động', color: '#16a34a', bg: '#dcfce7' },
  EXPIRED: { label: 'Hết hạn', color: '#dc2626', bg: '#fee2e2' },
  DEPLETED: { label: 'Đã dùng hết', color: '#6b7280', bg: '#f3f4f6' },
  CANCELLED: { label: 'Đã huỷ', color: '#d97706', bg: '#fef3c7' },
  PENDING: { label: 'Chờ xác nhận', color: '#d97706', bg: '#fef3c7' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#16a34a', bg: '#dcfce7' },
  COMPLETED: { label: 'Hoàn tất', color: '#6b7280', bg: '#f3f4f6' },
}

function StatusBadge({ status }) {
  const s = STATUS_LABEL[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' }
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
      {s.label}
    </span>
  )
}

export default function MySubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(null)

  const fetchSubscriptions = async () => {
    setLoading(true)
    try {
      const res = await subscriptionService.getMy()
      setSubscriptions(res.data.data || [])
    } catch {
      setError('Không thể tải danh sách gói dịch vụ')
    } finally {
      setLoading(false)
    }
  }

  const fetchRegistrations = async () => {
    try {
      const res = await serviceService.getMyRegistrations()
      setRegistrations(res.data.data || [])
    } catch {
      // Bỏ qua — danh sách đăng ký không quan trọng bằng gói dịch vụ chính
    }
  }

  useEffect(() => {
    fetchSubscriptions()
    fetchRegistrations()
  }, [])

  const handleCancel = async (id) => {
    if (!window.confirm('Bạn có chắc muốn huỷ gói dịch vụ này?')) return
    setCancelling(id)
    try {
      await subscriptionService.cancel(id)
      fetchSubscriptions()
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể huỷ gói')
    } finally {
      setCancelling(null)
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Dịch vụ của tôi</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Các dịch vụ và gói chăm sóc mắt bạn đã đăng ký</p>
          </div>
          <Link to="/services" style={{ background: '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
            + Mua gói mới
          </Link>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>{error}</div>}

        {registrations.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>Dịch vụ đã đăng ký</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {registrations.map(reg => (
                <div key={reg.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{reg.serviceName}</span>
                      <StatusBadge status={reg.status} />
                    </div>
                    {reg.registrationDate && (
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Ngày đăng ký: {reg.registrationDate}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {subscriptions.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <h3 style={{ color: '#1e293b', marginBottom: 8 }}>Chưa có gói dịch vụ nào</h3>
            <p style={{ color: '#64748b', marginBottom: 24 }}>Hãy mua một gói chăm sóc mắt để bắt đầu</p>
            <Link to="/services" style={{ background: '#2563eb', color: '#fff', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
              Xem gói dịch vụ
            </Link>
          </div>
        ) : (
          <div>
            {registrations.length > 0 && (
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>Gói dịch vụ đã mua</h2>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {subscriptions.map(sub => (
              <div key={sub.id} style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{sub.serviceName}</h3>
                      <StatusBadge status={sub.status} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                      <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Tiến độ buổi</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#2563eb' }}>{sub.usedSessions}/{sub.totalSessions}</div>
                        <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 6 }}>
                          <div style={{ height: '100%', background: '#2563eb', borderRadius: 2, width: `${(sub.usedSessions / sub.totalSessions) * 100}%` }} />
                        </div>
                      </div>
                      <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Còn lại</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a' }}>{sub.remainingSessions} buổi</div>
                      </div>
                      <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Ngày mua</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{sub.purchaseDate}</div>
                      </div>
                      {sub.expiryDate && (
                        <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '8px 12px' }}>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Hết hạn</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>{sub.expiryDate}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                    {sub.finalPrice && (
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#2563eb' }}>
                        {Number(sub.finalPrice).toLocaleString('vi-VN')}₫
                      </div>
                    )}
                    {sub.status === 'ACTIVE' && sub.remainingSessions > 0 && (
                      <Link to={`/patient/book-session?subscriptionId=${sub.id}`}
                        style={{ background: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
                        Đặt buổi khám
                      </Link>
                    )}
                    {sub.status === 'ACTIVE' && sub.usedSessions === 0 && (
                      <button onClick={() => handleCancel(sub.id)} disabled={cancelling === sub.id}
                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                        {cancelling === sub.id ? '...' : 'Huỷ gói'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
