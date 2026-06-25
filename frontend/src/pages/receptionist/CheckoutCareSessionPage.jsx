import { useEffect, useState } from 'react'
import { careSessionService } from '../../services/careSessionService'

export default function CheckoutCareSessionPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(null)
  const [filterDate, setFilterDate] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { fetchCompleted() }, [])

  const fetchCompleted = async () => {
    setLoading(true)
    try {
      const res = await careSessionService.getAll()
      const completed = (res.data.data || []).filter(s => s.status === 'COMPLETED')
      setSessions(completed)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async (id) => {
    if (!window.confirm('Xác nhận check-out và trừ buổi khỏi gói?')) return
    setCheckingOut(id)
    try {
      await careSessionService.checkout(id)
      setSessions(prev => prev.filter(s => s.id !== id))
      alert('Check-out thành công! Đã trừ 1 buổi khỏi gói.')
    } catch (err) {
      alert(err.response?.data?.message || 'Check-out thất bại')
    } finally {
      setCheckingOut(null)
    }
  }

  const formatDT = (dt) => {
    if (!dt) return ''
    const d = new Date(dt)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
  }

  const filtered = sessions.filter(s => {
    const matchSearch = !search || s.patientName.toLowerCase().includes(search.toLowerCase()) || s.patientCode?.includes(search)
    const matchDate = !filterDate || (s.scheduledDateTime && s.scheduledDateTime.startsWith(filterDate))
    return matchSearch && matchDate
  })

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Check-out buổi khám</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Các buổi đã hoàn thành, chờ check-out</p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Tìm bệnh nhân..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' }} />
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' }} />
          <button onClick={fetchCompleted} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            Làm mới
          </button>
        </div>

        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 14, color: '#92400e' }}>
          <strong>⚠️ Lưu ý:</strong> Check-out sẽ tự động trừ 1 buổi khỏi gói dịch vụ của bệnh nhân. Hãy kiểm tra kỹ trước khi xác nhận.
        </div>

        {filtered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p style={{ color: '#64748b' }}>Không có buổi khám nào chờ check-out</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(s => (
              <div key={s.id} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{s.patientName}</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>({s.patientCode})</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    {s.serviceName} • Buổi {s.sessionNumber}/{s.totalSessions} • {formatDT(s.scheduledDateTime)}
                  </div>
                  {s.nurseName && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>ĐD: {s.nurseName}</div>}
                  {s.nurseNotes && <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>Ghi chú: {s.nurseNotes}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Còn lại sau check-out: {s.remainingSessions - 1} buổi</div>
                  <button onClick={() => handleCheckout(s.id)} disabled={checkingOut === s.id}
                    style={{ background: checkingOut === s.id ? '#86efac' : '#16a34a', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: checkingOut === s.id ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}>
                    {checkingOut === s.id ? 'Đang xử lý...' : 'Check-out'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
