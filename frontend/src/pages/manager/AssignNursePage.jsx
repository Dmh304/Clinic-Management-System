import { useEffect, useMemo, useState } from 'react'
import { careSessionService } from '../../services/careSessionService'

const CAPACITY_EXCEEDED_PREFIX = 'CAPACITY_EXCEEDED: '

export default function AssignNursePage() {
  const [sessions, setSessions] = useState([])
  const [nurses, setNurses] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(null)
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [selected, setSelected] = useState({}) // {sessionId: nurseId}
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const loadData = () => {
    setLoading(true)
    return Promise.all([
      careSessionService.getAll(date),
      careSessionService.getNurses(),
    ]).then(([sessRes, nurseRes]) => {
      const booked = (sessRes.data || []).filter(s => s.status === 'BOOKED')
      setSessions(booked)
      setNurses(nurseRes.data || [])
    }).finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [date])

  // UC-19 bước 2: tải hiện tại của từng điều dưỡng trong ngày đang xem — tính trực tiếp
  // từ danh sách buổi BOOKED đã tải (không cần thêm API riêng).
  const workloadByNurse = useMemo(() => {
    const map = {}
    for (const s of sessions) {
      if (s.nurseId) map[s.nurseId] = (map[s.nurseId] || 0) + 1
    }
    return map
  }, [sessions])

  const unassignedSessions = sessions.filter(s => !s.nurseId)
  const assignedSessions = sessions.filter(s => s.nurseId)

  const doAssign = async (sessionId, nurseId, override) => {
    setAssigning(sessionId)
    try {
      await careSessionService.assignNurse(sessionId, Number(nurseId), override)
      const nurse = nurses.find(n => n.id === Number(nurseId))
      setSessions(prev => prev.map(s => s.id === sessionId
        ? { ...s, nurseId: Number(nurseId), nurseName: nurse?.fullName }
        : s))
      alert('Phân công điều dưỡng thành công!')
      return true
    } catch (err) {
      const msg = err.response?.data?.message || 'Lỗi khi phân công'
      // UC-19 E-2: đủ sức chứa → hỏi lại Manager có muốn ghi đè (override) không, thay vì chỉ báo lỗi.
      if (msg.startsWith(CAPACITY_EXCEEDED_PREFIX)) {
        const reason = msg.slice(CAPACITY_EXCEEDED_PREFIX.length)
        if (window.confirm(reason)) {
          return doAssign(sessionId, nurseId, true)
        }
        return false
      }
      alert(msg)
      return false
    } finally {
      setAssigning(null)
    }
  }

  const handleAssign = (sessionId) => {
    const nurseId = selected[sessionId]
    if (!nurseId) return alert('Vui lòng chọn điều dưỡng')
    doAssign(sessionId, nurseId, false)
  }

  const handleAutoAssign = async () => {
    if (!window.confirm(`Tự động phân công tất cả buổi chưa có điều dưỡng trong ngày ${date}?`)) return
    setAutoAssigning(true)
    try {
      const res = await careSessionService.autoAssignRemaining(date)
      alert(
        `Đã tự động phân công ${res.data.assignedCount} buổi` +
        (res.data.stillUnassignedCount > 0
          ? `, còn ${res.data.stillUnassignedCount} buổi chưa phân công được (không đủ điều dưỡng).`
          : '.')
      )
      loadData()
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi tự động phân công')
    } finally {
      setAutoAssigning(false)
    }
  }

  const formatDT = (dt) => {
    if (!dt) return ''
    const d = new Date(dt)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const renderSessionRow = (s) => (
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
            {nurses.map(n => (
              <option key={n.id} value={n.id}>
                {n.fullName} ({workloadByNurse[n.id] || 0}/{12} buổi)
              </option>
            ))}
          </select>
          <button onClick={() => handleAssign(s.id)} disabled={assigning === s.id || !selected[s.id]}
            style={{ background: assigning === s.id ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: 8, cursor: assigning === s.id ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
            {assigning === s.id ? '...' : (s.nurseId ? 'Đổi ĐD' : 'Phân công')}
          </button>
        </div>
      </div>
    </div>
  )

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Phân công điều dưỡng</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Giao các buổi khám cho điều dưỡng thực hiện</p>
          </div>
          <button onClick={handleAutoAssign} disabled={autoAssigning || unassignedSessions.length === 0}
            style={{
              background: autoAssigning || unassignedSessions.length === 0 ? '#e2e8f0' : '#7c3aed', color: '#fff', border: 'none',
              padding: '10px 18px', borderRadius: 8, cursor: autoAssigning || unassignedSessions.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
            }}>
            {autoAssigning ? 'Đang phân công...' : `⚡ Tự động phân công (${unassignedSessions.length})`}
          </button>
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
          <>
            {unassignedSessions.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 10, textTransform: 'uppercase' }}>
                  Chưa phân công ({unassignedSessions.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {unassignedSessions.map(renderSessionRow)}
                </div>
              </div>
            )}
            {assignedSessions.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 10, textTransform: 'uppercase' }}>
                  Đã phân công ({assignedSessions.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {assignedSessions.map(renderSessionRow)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
