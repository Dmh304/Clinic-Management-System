// UC-59: Manage Staff Room Roster
import { useEffect, useState } from 'react'
import { roomService, roomRosterService } from '../../services/roomService'

const ROLE_TO_ROOM_TYPE = { DOCTOR: 'DOCTOR', NURSE: 'NURSE', LAB_TECHNICIAN: 'LAB' }
const ROLE_LABEL = { DOCTOR: 'Bác sĩ', NURSE: 'Điều dưỡng', LAB_TECHNICIAN: 'Kỹ thuật viên xét nghiệm' }

export default function RoomRosterPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [roster, setRoster] = useState([])
  const [roomsByType, setRoomsByType] = useState({ DOCTOR: [], NURSE: [], LAB: [] })
  const [loading, setLoading] = useState(true)
  const [selectedRoom, setSelectedRoom] = useState({}) // {staffUserId: roomId}
  const [oneDayOnly, setOneDayOnly] = useState({}) // {staffUserId: boolean}
  const [assigning, setAssigning] = useState(null)

  const loadData = () => {
    setLoading(true)
    return Promise.all([
      roomRosterService.getRosterForDate(date),
      roomService.getActiveByType('DOCTOR'),
      roomService.getActiveByType('NURSE'),
      roomService.getActiveByType('LAB'),
    ]).then(([rosterRes, doctorRooms, nurseRooms, labRooms]) => {
      setRoster(rosterRes.data || [])
      setRoomsByType({ DOCTOR: doctorRooms.data || [], NURSE: nurseRooms.data || [], LAB: labRooms.data || [] })
    }).finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [date])

  const doAssign = async (staffUserId, roomId, oneDay, forceOverrideCapacity) => {
    setAssigning(staffUserId)
    try {
      await roomRosterService.assign({
        staffUserId,
        roomId: Number(roomId),
        effectiveFrom: oneDay ? null : date,
        oneDayOnly: oneDay,
        overrideDate: oneDay ? date : null,
        forceOverrideCapacity,
      })
      alert('Phân công phòng thành công!')
      loadData()
    } catch (err) {
      const msg = err.response?.data?.message || 'Lỗi khi phân công phòng'
      // UC-59 E-2: phòng đã đủ sức chứa → hỏi lại Manager có muốn ghi đè không.
      if (msg.includes('đủ sức chứa')) {
        if (window.confirm(msg + '\n\nVẫn phân công (ghi đè)?')) {
          return doAssign(staffUserId, roomId, oneDay, true)
        }
        return
      }
      alert(msg)
    } finally {
      setAssigning(null)
    }
  }

  const handleAssign = (staffUserId) => {
    const roomId = selectedRoom[staffUserId]
    if (!roomId) return alert('Vui lòng chọn phòng')
    doAssign(staffUserId, roomId, !!oneDayOnly[staffUserId], false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  const grouped = ['DOCTOR', 'NURSE', 'LAB_TECHNICIAN'].map(role => ({
    role,
    entries: roster.filter(r => r.staffRole === role),
  }))

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Phân công phòng theo ngày (UC-59)</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
            Gán bác sĩ/điều dưỡng/kỹ thuật viên vào phòng — phân công giữ nguyên cho tới khi bạn đổi lại
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' }} />
        </div>

        {grouped.map(({ role, entries }) => (
          <div key={role} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 10, textTransform: 'uppercase' }}>
              {ROLE_LABEL[role]} ({entries.length})
            </div>
            {entries.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, textAlign: 'center', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: 13 }}>
                Chưa có nhân sự thuộc vai trò này
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {entries.map(entry => {
                  const roomOptions = roomsByType[ROLE_TO_ROOM_TYPE[role]] || []
                  return (
                    <div key={entry.staffUserId} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>{entry.staffFullName}</div>
                          <div style={{ fontSize: 13, color: entry.roomName ? '#16a34a' : '#dc2626', marginTop: 2 }}>
                            {entry.roomName
                              ? `Phòng hiện tại: ${entry.roomName}${entry.isOverrideToday ? ' (đổi riêng ngày này)' : ''}`
                              : 'Chưa được phân công phòng'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b' }}>
                            <input type="checkbox" checked={!!oneDayOnly[entry.staffUserId]}
                              onChange={e => setOneDayOnly(prev => ({ ...prev, [entry.staffUserId]: e.target.checked }))} />
                            Chỉ áp dụng ngày này
                          </label>
                          <select value={selectedRoom[entry.staffUserId] || ''}
                            onChange={e => setSelectedRoom(prev => ({ ...prev, [entry.staffUserId]: e.target.value }))}
                            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, outline: 'none' }}>
                            <option value="">-- Chọn phòng --</option>
                            {roomOptions.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                          <button onClick={() => handleAssign(entry.staffUserId)} disabled={assigning === entry.staffUserId || !selectedRoom[entry.staffUserId]}
                            style={{ background: assigning === entry.staffUserId ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: 8, cursor: assigning === entry.staffUserId ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
                            {assigning === entry.staffUserId ? '...' : (entry.roomName ? 'Đổi phòng' : 'Phân công')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
