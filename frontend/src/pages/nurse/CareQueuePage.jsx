import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { careSessionService } from '../../services/careSessionService'

export default function CareQueuePage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => { fetchQueue() }, [])

  const fetchQueue = async () => {
    setLoading(true)
    try {
      const res = await careSessionService.getQueue()
      setSessions(res.data.data || [])
    } catch {
      setError('Không thể tải hàng đợi')
    } finally {
      setLoading(false)
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
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Hàng đợi buổi khám</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Các buổi khám được phân công cho bạn hôm nay</p>
          </div>
          <button onClick={fetchQueue} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            Làm mới
          </button>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div style={{ background: '#dbeafe', borderRadius: 10, padding: '12px 20px', flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#2563eb' }}>{sessions.length}</div>
            <div style={{ fontSize: 13, color: '#1d4ed8' }}>Buổi chờ khám</div>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p style={{ color: '#64748b' }}>Không có buổi khám nào trong hàng đợi</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sessions.map((s, idx) => (
              <div key={s.id} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, background: '#dbeafe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#2563eb', flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{s.patientName}</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      {s.serviceName} • Buổi {s.sessionNumber}/{s.totalSessions} • {formatDT(s.scheduledDateTime)}
                    </div>
                    {s.notes && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Ghi chú: {s.notes}</div>}
                  </div>
                </div>
                <button onClick={() => navigate(`/nurse/deliver/${s.id}`)}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                  Bắt đầu khám
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
