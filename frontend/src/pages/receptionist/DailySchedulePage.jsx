import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import axiosClient from '../../api/axiosClient'

const STATUS_INFO = {
  PENDING: { label: 'Chờ', color: '#d97706', bg: '#fef3c7' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#2563eb', bg: '#dbeafe' },
  WAITING: { label: 'Đang chờ khám', color: '#7c3aed', bg: '#ede9fe' },
  IN_PROGRESS: { label: 'Đang khám', color: '#ea580c', bg: '#ffedd5' },
  COMPLETED: { label: 'Hoàn thành', color: '#16a34a', bg: '#dcfce7' },
  CANCELLED: { label: 'Đã huỷ', color: '#dc2626', bg: '#fee2e2' },
}

const WEEKDAY_SHORT = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7']
const VIEW_LABELS = { day: 'Ngày', week: 'Tuần', month: 'Tháng' }

// Tuần bắt đầu từ Thứ Hai theo quy ước Việt Nam (dayjs mặc định tuần bắt đầu Chủ Nhật)
function startOfWeekMonday(d) {
  const dow = d.day() // 0=CN, 1=T2, ... 6=T7
  const diff = dow === 0 ? -6 : 1 - dow
  return d.add(diff, 'day').startOf('day')
}

function formatTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function DailySchedulePage() {
  const [viewMode, setViewMode] = useState('day')
  const [anchorDate, setAnchorDate] = useState(dayjs().startOf('day'))
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterDoctor, setFilterDoctor] = useState('')
  const [doctors, setDoctors] = useState([])

  // Khoảng ngày cần tải dữ liệu, tuỳ theo view đang chọn
  const range = useMemo(() => {
    if (viewMode === 'day') {
      return { start: anchorDate, end: anchorDate, gridStart: anchorDate, gridEnd: anchorDate }
    }
    if (viewMode === 'week') {
      const start = startOfWeekMonday(anchorDate)
      const end = start.add(6, 'day')
      return { start, end, gridStart: start, gridEnd: end }
    }
    // month: lưới hiển thị kéo dài hết tuần chứa ngày 1 và ngày cuối tháng
    const monthStart = anchorDate.startOf('month')
    const monthEnd = anchorDate.endOf('month')
    const gridStart = startOfWeekMonday(monthStart)
    const gridEnd = startOfWeekMonday(monthEnd).add(6, 'day')
    return { start: monthStart, end: monthEnd, gridStart, gridEnd }
  }, [viewMode, anchorDate])

  const fetchSchedule = async () => {
    setLoading(true)
    try {
      let data = []
      if (viewMode === 'day') {
        const res = await axiosClient.get('/v1/appointments/daily-schedule', {
          params: { date: anchorDate.format('YYYY-MM-DD') },
        })
        data = res.data.data || []
      } else {
        const res = await axiosClient.get('/v1/appointments/schedule-range', {
          params: {
            startDate: range.gridStart.format('YYYY-MM-DD'),
            endDate: range.gridEnd.format('YYYY-MM-DD'),
          },
        })
        data = res.data.data || []
      }
      setAppointments(data)
      const uniqueDoctors = [...new Map(data.filter(a => a.doctorName).map(a => [a.doctorId, a.doctorName])).entries()]
        .map(([id, name]) => ({ id, name }))
      setDoctors(uniqueDoctors)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchedule()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.gridStart.format('YYYY-MM-DD'), range.gridEnd.format('YYYY-MM-DD')])

  const filtered = filterDoctor ? appointments.filter(a => String(a.doctorId) === filterDoctor) : appointments

  // Nhóm lịch hẹn theo ngày (YYYY-MM-DD) để tra cứu nhanh cho lưới tuần/tháng
  const byDate = useMemo(() => {
    const map = new Map()
    for (const a of filtered) {
      if (!a.appointmentTime) continue
      const key = dayjs(a.appointmentTime).format('YYYY-MM-DD')
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(a)
    }
    for (const arr of map.values()) arr.sort((a, b) => new Date(a.appointmentTime) - new Date(b.appointmentTime))
    return map
  }, [filtered])

  const stats = {
    total: filtered.length,
    confirmed: filtered.filter(a => a.status === 'CONFIRMED' || a.status === 'WAITING').length,
    completed: filtered.filter(a => a.status === 'COMPLETED').length,
    cancelled: filtered.filter(a => a.status === 'CANCELLED').length,
  }

  const goToday = () => {
    const today = dayjs().startOf('day')
    if (today.isSame(anchorDate, 'day')) {
      fetchSchedule() // đã ở "hôm nay" rồi, ngày không đổi nên ép tải lại để lấy dữ liệu mới nhất
    } else {
      setAnchorDate(today)
    }
  }
  const goPrev = () => setAnchorDate(d => d.subtract(1, viewMode === 'day' ? 'day' : viewMode === 'week' ? 'week' : 'month'))
  const goNext = () => setAnchorDate(d => d.add(1, viewMode === 'day' ? 'day' : viewMode === 'week' ? 'week' : 'month'))
  const jumpToDay = (d) => { setAnchorDate(d.startOf('day')); setViewMode('day') }

  const title = useMemo(() => {
    if (viewMode === 'day') {
      return anchorDate.toDate().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    }
    if (viewMode === 'week') {
      return `${range.start.format('DD/MM/YYYY')} – ${range.end.format('DD/MM/YYYY')}`
    }
    return anchorDate.toDate().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
  }, [viewMode, anchorDate, range])

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Lịch khám</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Xem lịch hẹn theo ngày, tuần hoặc tháng</p>
        </div>

        {/* Toolbar: view switch + navigation + filter */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
              <button onClick={goPrev} style={{ padding: '8px 12px', border: 'none', background: '#fff', cursor: 'pointer', borderRight: '1px solid #e2e8f0' }}>‹</button>
              <button onClick={goToday} style={{ padding: '8px 14px', border: 'none', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#2563eb', borderRight: '1px solid #e2e8f0' }}>Hôm nay</button>
              <button onClick={goNext} style={{ padding: '8px 12px', border: 'none', background: '#fff', cursor: 'pointer' }}>›</button>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>{title}</span>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {doctors.length > 0 && (
              <select value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' }}>
                <option value="">Tất cả bác sĩ</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
            <button
              onClick={fetchSchedule}
              disabled={loading}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff',
                cursor: loading ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, color: '#374151',
              }}
            >
              {loading ? 'Đang tải...' : '↻ Làm mới'}
            </button>
            <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
              {Object.entries(VIEW_LABELS).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: viewMode === mode ? '#2563eb' : '#fff',
                    color: viewMode === mode ? '#fff' : '#374151',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Tổng cộng', value: stats.total, color: '#2563eb', bg: '#dbeafe' },
            { label: 'Đang chờ/Xác nhận', value: stats.confirmed, color: '#7c3aed', bg: '#ede9fe' },
            { label: 'Hoàn thành', value: stats.completed, color: '#16a34a', bg: '#dcfce7' },
            { label: 'Đã huỷ', value: stats.cancelled, color: '#dc2626', bg: '#fee2e2' },
          ].map(stat => (
            <div key={stat.label} style={{ background: stat.bg, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: stat.color, opacity: 0.8 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>
        ) : viewMode === 'day' ? (
          <DayList appointments={filtered} />
        ) : viewMode === 'week' ? (
          <WeekGrid gridStart={range.gridStart} byDate={byDate} onDayClick={jumpToDay} />
        ) : (
          <MonthGrid gridStart={range.gridStart} gridEnd={range.gridEnd} currentMonth={anchorDate.month()} byDate={byDate} onDayClick={jumpToDay} />
        )}
      </div>
    </div>
  )
}

// ─── View Ngày: bảng chi tiết (giữ nguyên hành vi cũ) ──────────────
function DayList({ appointments }) {
  if (appointments.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', border: '1px solid #e2e8f0' }}>
        <p style={{ color: '#64748b' }}>Không có lịch hẹn nào trong ngày này</p>
      </div>
    )
  }
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            {['Giờ', 'Bệnh nhân', 'Bác sĩ', 'Dịch vụ', 'Loại', 'Trạng thái'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {appointments.map((a, i) => {
            const info = STATUS_INFO[a.status] || { label: a.status, color: '#6b7280', bg: '#f3f4f6' }
            return (
              <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1e293b' }}>{formatTime(a.appointmentTime)}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{a.patientName}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{a.patientPhone}</div>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 14, color: '#374151' }}>{a.doctorName || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 14, color: '#374151' }}>{a.serviceName || '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: 11, background: a.type === 'WALK_IN' ? '#fef3c7' : '#dbeafe', color: a.type === 'WALK_IN' ? '#d97706' : '#2563eb', padding: '2px 7px', borderRadius: 8, fontWeight: 600 }}>
                    {a.type === 'WALK_IN' ? 'Vãng lai' : 'Đặt trước'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ background: info.bg, color: info.color, padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>{info.label}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Chip lịch hẹn dùng chung cho view Tuần/Tháng ──────────────────
function AppointmentChip({ a, compact }) {
  const info = STATUS_INFO[a.status] || { label: a.status, color: '#6b7280', bg: '#f3f4f6' }
  return (
    <div
      title={`${formatTime(a.appointmentTime)} — ${a.patientName}${a.doctorName ? ' — ' + a.doctorName : ''}`}
      style={{
        background: info.bg, color: info.color, borderRadius: 6,
        padding: compact ? '2px 6px' : '4px 8px',
        fontSize: compact ? 11 : 12, fontWeight: 600,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}
    >
      {formatTime(a.appointmentTime)} {a.patientName}
    </div>
  )
}

// ─── View Tuần: 7 cột Thứ 2 → Chủ Nhật ─────────────────────────────
function WeekGrid({ gridStart, byDate, onDayClick }) {
  const days = Array.from({ length: 7 }, (_, i) => gridStart.add(i, 'day'))
  const isToday = (d) => d.isSame(dayjs(), 'day')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
      {days.map(d => {
        const key = d.format('YYYY-MM-DD')
        const items = byDate.get(key) || []
        return (
          <div key={key} style={{ background: '#fff', borderRadius: 12, border: isToday(d) ? '2px solid #2563eb' : '1px solid #e2e8f0', minHeight: 240, display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={() => onDayClick(d)}
              style={{
                border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
                padding: '10px 12px', borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{WEEKDAY_SHORT[d.day()]}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: isToday(d) ? '#2563eb' : '#1e293b' }}>{d.format('DD/MM')}</div>
            </button>
            <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 5, overflowY: 'auto', flex: 1 }}>
              {items.length === 0 ? (
                <span style={{ fontSize: 12, color: '#cbd5e1', textAlign: 'center', marginTop: 8 }}>—</span>
              ) : (
                items.map(a => <AppointmentChip key={a.id} a={a} />)
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── View Tháng: lưới 6 hàng x 7 cột ────────────────────────────────
function MonthGrid({ gridStart, gridEnd, currentMonth, byDate, onDayClick }) {
  const totalDays = gridEnd.diff(gridStart, 'day') + 1
  const days = Array.from({ length: totalDays }, (_, i) => gridStart.add(i, 'day'))
  const isToday = (d) => d.isSame(dayjs(), 'day')
  const MAX_VISIBLE = 3

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e2e8f0' }}>
        {WEEKDAY_SHORT.map(w => (
          <div key={w} style={{ padding: '8px 0', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#64748b', background: '#f8fafc' }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map(d => {
          const key = d.format('YYYY-MM-DD')
          const items = byDate.get(key) || []
          const inMonth = d.month() === currentMonth
          return (
            <div
              key={key}
              onClick={() => onDayClick(d)}
              style={{
                minHeight: 110, padding: 6, borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9',
                cursor: 'pointer', background: inMonth ? '#fff' : '#fafafa',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}
            >
              <span style={{
                fontSize: 13, fontWeight: 700, alignSelf: 'flex-start',
                color: isToday(d) ? '#fff' : inMonth ? '#1e293b' : '#cbd5e1',
                background: isToday(d) ? '#2563eb' : 'transparent',
                borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {d.date()}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {items.slice(0, MAX_VISIBLE).map(a => <AppointmentChip key={a.id} a={a} compact />)}
                {items.length > MAX_VISIBLE && (
                  <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>+{items.length - MAX_VISIBLE} nữa</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
