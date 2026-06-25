import { useEffect, useState } from 'react'
import { careSessionService } from '../../services/careSessionService'

export default function AssignNursePage() {
  const [sessions, setSessions] = useState([])
  const [nurses, setNurses] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(null)
  const [selected, setSelected] = useState({}) // {sessionId: nurseId}
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    Promise.all([
      careSessionService.getAll(date),
      careSessionService.getNurses(),
    ]).then(([sessRes, nurseRes]) => {
      const booked = (sessRes.data.data || []).filter(s => s.status === 'BOOKED')
      setSessions(booked)
      setNurses(nurseRes.data.data || [])
    }).finally(() => setLoading(false))
  }, [date])

  const handleAssign = async (sessionId) => {
    const nurseId = selected[sessionId]
    if (!nurseId) return alert('Vui lòng chọn điều dưỡng')
    setAssigning(sessionId)
    try {
      await careSessionService.assignNurse(sessionId, Number(nurseId))
      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          const nurse = nurses.find(n => n.id === Number(nurseId))
          return { ...s, nurseId: Number(nurseId), nurseName: nurse?.fullName }
        }
        return s
      }))
      alert('Phân công điều dưỡng thành công!')
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi phân công')
    } finally {
      setAssigning(null)
    }
  }

  const formatDT = (dt) => {
    if (!dt) return ''
    const d = new Date(dt)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Phân công điều dưỡng</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Giao các buổi khám cho điều dưỡng thực hiện</p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' }} />
        </div>

        {nurses.length === 0 && (
          <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: '#92400e' }}>
            Chưa có điều dưỡng nào trong hệ thống. Hãy tạo tài khoản với role NURSE trước.
          </div>
        )}

        {sessions.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <p style={{ color: '#64748b' }}>Không có buổi khám nào cần phân công trong ngày này</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sessions.map(s => (
              <div key={s.id} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{s.patientName}</span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>({s.patientCode})</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      {s.serviceName} • Buổi {s.sessionNumber} • {formatDT(s.scheduledDateTime)}
                    </div>
                    {s.nurseName && (
                      <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>Đã phân công: {s.nurseName}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select value={selected[s.id] || s.nurseId || ''}
                      onChange={e => setSelected(prev => ({ ...prev, [s.id]: e.target.value }))}
                      style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, outline: 'none' }}>
                      <option value="">-- Chọn điều dưỡng --</option>
                      {nurses.map(n => <option key={n.id} value={n.id}>{n.fullName}</option>)}
                    </select>
                    <button onClick={() => handleAssign(s.id)} disabled={assigning === s.id || !selected[s.id]}
                      style={{ background: assigning === s.id ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: 8, cursor: assigning === s.id ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
                      {assigning === s.id ? '...' : (s.nurseId ? 'Đổi ĐD' : 'Phân công')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
