import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { careSessionService } from '../../services/careSessionService'

export default function DeliverCareSessionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [nurseNotes, setNurseNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Get sessions and find the one by id
    Promise.all([careSessionService.getQueue(), careSessionService.getMy()]).then(([queueRes, myRes]) => {
      const all = [...(queueRes.data.data || []), ...(myRes.data.data || [])]
      const found = all.find(s => String(s.id) === String(id))
      if (found) setSession(found)
      else setError('Không tìm thấy buổi khám')
    }).finally(() => setLoading(false))
  }, [id])

  const handleStart = async () => {
    setProcessing(true)
    setError('')
    try {
      const res = await careSessionService.start(id)
      setSession(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể bắt đầu buổi khám')
    } finally {
      setProcessing(false)
    }
  }

  const handleComplete = async () => {
    if (!nurseNotes.trim()) {
      setError('Vui lòng nhập ghi chú sau khi hoàn thành')
      return
    }
    setProcessing(true)
    setError('')
    try {
      await careSessionService.complete(id, nurseNotes)
      alert('Hoàn thành buổi khám thành công!')
      navigate('/nurse/queue')
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể hoàn thành')
    } finally {
      setProcessing(false)
    }
  }

  const formatDT = (dt) => {
    if (!dt) return ''
    const d = new Date(dt)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <button onClick={() => navigate('/nurse/queue')} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 14, marginBottom: 16, padding: 0 }}>
          ← Quay lại hàng đợi
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: '0 0 24px' }}>Thực hiện buổi khám</h1>

        {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>{error}</div>}

        {session && (
          <>
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0', marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#1e293b' }}>Thông tin buổi khám</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <InfoRow label="Bệnh nhân" value={session.patientName} />
                <InfoRow label="Mã BN" value={session.patientCode} />
                <InfoRow label="Dịch vụ" value={session.serviceName} />
                <InfoRow label="Buổi số" value={`${session.sessionNumber}/${session.totalSessions}`} />
                <InfoRow label="Lịch hẹn" value={formatDT(session.scheduledDateTime)} />
                <InfoRow label="Trạng thái" value={session.status === 'BOOKED' ? 'Chờ khám' : 'Đang thực hiện'} />
              </div>
              {session.notes && (
                <div style={{ marginTop: 12, padding: '10px 12px', background: '#fffbeb', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
                  <strong>Ghi chú BN:</strong> {session.notes}
                </div>
              )}
            </div>

            <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px', color: '#1e293b' }}>Ghi chú điều dưỡng</h3>
              <textarea value={nurseNotes} onChange={e => setNurseNotes(e.target.value)} rows={5}
                placeholder="Nhập kết quả khám, tình trạng bệnh nhân, lưu ý..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                {session.status === 'BOOKED' && (
                  <button onClick={handleStart} disabled={processing}
                    style={{ flex: 1, background: processing ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: processing ? 'not-allowed' : 'pointer' }}>
                    {processing ? '...' : '▶ Bắt đầu khám'}
                  </button>
                )}
                {session.status === 'IN_PROGRESS' && (
                  <button onClick={handleComplete} disabled={processing}
                    style={{ flex: 1, background: processing ? '#86efac' : '#16a34a', color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: processing ? 'not-allowed' : 'pointer' }}>
                    {processing ? '...' : '✓ Hoàn thành'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{value || '—'}</div>
    </div>
  )
}
