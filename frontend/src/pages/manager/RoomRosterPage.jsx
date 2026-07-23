import { useEffect, useState } from 'react'
import { roomService } from '../../services/roomService'
import { staffDirectoryService } from '../../services/staffDirectoryService'
import { doctorService } from '../../services/doctorService'
import Header from '../../components/layout/Header'

// Map loại nhân sự -> category phòng tương ứng, đúng validateCategoryMatchesStaffType ở backend
const STAFF_TYPE_CONFIG = {
  DOCTOR: { label: 'Bác sĩ', category: 'CLINICAL_EXAM' },
  NURSE: { label: 'Điều dưỡng', category: 'CARE_RECOVERY' },
  LAB_TECHNICIAN: { label: 'Kỹ thuật viên xét nghiệm', category: 'DIAGNOSTIC_IMAGING' },
}

const todayIso = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export default function RoomRosterPage() {
  const [date, setDate] = useState(todayIso())
  const [roster, setRoster] = useState([]) // [{staffType, staffId, staffFullName, roomId, roomName, isOneDayOverride}]
  const [doctors, setDoctors] = useState([])
  const [nurses, setNurses] = useState([])
  const [labTechs, setLabTechs] = useState([])
  const [roomsByCategory, setRoomsByCategory] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingSelection, setPendingSelection] = useState({}) // key `${type}:${id}` -> roomId
  const [oneDayOverride, setOneDayOverride] = useState({}) // key -> boolean
  const [saving, setSaving] = useState('')

  const loadAll = async () => {
    setLoading(true)
    setError('')
    try {
      const [rosterRes, doctorsRes, clinicalRooms, careRooms, imagingRooms, workshopRooms] = await Promise.all([
        roomService.getRoster(date),
        doctorService.getAllDoctors(),
        roomService.getRoomsByCategory('CLINICAL_EXAM'),
        roomService.getRoomsByCategory('CARE_RECOVERY'),
        roomService.getRoomsByCategory('DIAGNOSTIC_IMAGING'),
        roomService.getRoomsByCategory('OPTICAL_WORKSHOP'),
      ])

      setRoster(rosterRes.data || [])
      setDoctors(doctorsRes.data || [])
      setRoomsByCategory({
        CLINICAL_EXAM: clinicalRooms.data || [],
        CARE_RECOVERY: careRooms.data || [],
        // Lab Technician có thể trực 1 trong 2 category — gộp lại để chọn chung
        LAB: [...(imagingRooms.data || []), ...(workshopRooms.data || [])],
      })

      // ⚠️ Hai lời gọi dưới đây phụ thuộc staffDirectoryService — xem TODO
      // trong file đó. Bọc try/catch riêng để 1 API lỗi không sập cả trang.
      try {
        const nursesRes = await staffDirectoryService.getActiveNurses()
        setNurses(nursesRes.data || [])
      } catch {
        setNurses([])
      }
      try {
        const labTechRes = await staffDirectoryService.getActiveLabTechnicians()
        setLabTechs(labTechRes.data || [])
      } catch {
        setLabTechs([])
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi tải dữ liệu phân trực')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadAll() }, [date])

  const findCurrentAssignment = (staffType, staffId) =>
    roster.find((r) => r.staffType === staffType && r.staffId === staffId)

  const staffKey = (type, id) => `${type}:${id}`

  const handleAssign = async (staffType, staffId) => {
    const key = staffKey(staffType, staffId)
    const roomId = pendingSelection[key]
    if (!roomId) { setError('Vui lòng chọn phòng trước khi gán'); return }

    setSaving(key)
    setError('')
    try {
      await roomService.assignRoom({
        staffType,
        staffId,
        roomId: Number(roomId),
        date,
        oneDayOverride: !!oneDayOverride[key],
        forceOverride: false,
      })
      await loadAll()
    } catch (err) {
      const msg = err.response?.data?.message || ''
      if (msg.includes('already has staff assigned')) {
        // ALT-2: phòng đã có người trực trùng ngày — hỏi xác nhận ghi đè
        if (window.confirm('Phòng này đã có người trực hôm nay. Vẫn muốn gán đè?')) {
          try {
            await roomService.assignRoom({
              staffType, staffId, roomId: Number(roomId), date,
              oneDayOverride: !!oneDayOverride[key], forceOverride: true,
            })
            await loadAll()
          } catch (err2) {
            setError(err2.response?.data?.message || 'Lỗi khi gán phòng')
          }
        }
      } else {
        setError(msg || 'Lỗi khi gán phòng')
      }
    } finally {
      setSaving('')
    }
  }

  const renderStaffSection = (staffType, staffList) => {
    const config = STAFF_TYPE_CONFIG[staffType]
    const rooms = staffType === 'LAB_TECHNICIAN' ? roomsByCategory.LAB : roomsByCategory[config.category]

    return (
      <>
      {/* <Header/> */}
      <div key={staffType} style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 10 }}>
          {config.label}
        </h3>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Nhân sự', 'Phòng hiện tại', 'Gán phòng mới', 'Chỉ hôm nay?', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffList.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Không có dữ liệu</td></tr>
              )}
              {staffList.map((staff, i) => {
                const current = findCurrentAssignment(staffType, staff.id)
                const key = staffKey(staffType, staff.id)
                return (
                  <tr key={staff.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e293b' }}>{staff.fullName}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>
                      {current
                        ? <span>{current.roomName} {current.isOneDayOverride && <em style={{ color: '#f59e0b' }}> (hôm nay)</em>}</span>
                        : <span style={{ color: '#94a3b8' }}>Chưa phân trực</span>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <select
                        value={pendingSelection[key] || ''}
                        onChange={(e) => setPendingSelection({ ...pendingSelection, [key]: e.target.value })}
                        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
                      >
                        <option value="">-- Chọn phòng --</option>
                        {(rooms || []).map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={!!oneDayOverride[key]}
                        onChange={(e) => setOneDayOverride({ ...oneDayOverride, [key]: e.target.checked })}
                      />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => handleAssign(staffType, staff.id)}
                        disabled={saving === key}
                        style={{
                          background: '#2563eb', color: '#fff', border: 'none', padding: '6px 14px',
                          borderRadius: 6, cursor: saving === key ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600,
                        }}
                      >
                        {saving === key ? 'Đang gán...' : 'Gán'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      </>
    )
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>
  )

  return (
    <>
    <Header/>
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Phân trực phòng (UC-56)</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
              Gán phòng cho nhân sự — assignment mặc định áp dụng lâu dài cho tới khi bạn đổi lại
            </p>
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#64748b', marginRight: 8 }}>Ngày:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
            />
          </div>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        {renderStaffSection('DOCTOR', doctors)}
        {renderStaffSection('NURSE', nurses)}
        {renderStaffSection('LAB_TECHNICIAN', labTechs)}
      </div>
    </div>
    </>
  )
}
