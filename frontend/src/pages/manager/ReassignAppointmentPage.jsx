import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosClient from '../../api/axiosClient'
import { pageTitle } from './managerTypography'

const STATUS_ACTIVE = ['PENDING', 'CONFIRMED', 'WAITING']

// Cùng bảng màu/nhãn trạng thái đang dùng ở dashboard lễ tân (AppointmentManagementPage,
// DailySchedulePage) để 2 màn hình nhất quán về mặt hình ảnh.
const STATUS_INFO = {
  PENDING: { label: 'Chờ xác nhận', color: '#d97706', bg: '#fef3c7' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#2563eb', bg: '#dbeafe' },
  WAITING: { label: 'Chờ khám', color: '#7c3aed', bg: '#ede9fe' },
}

const TYPE_INFO = {
  WALK_IN: { label: 'Vãng lai', color: '#d97706', bg: '#fef3c7' },
  ONLINE: { label: 'Đặt trước', color: '#2563eb', bg: '#dbeafe' },
}

function toLocalISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function stripDiacritics(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

function formatTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function ReassignAppointmentPage() {
  const navigate = useNavigate()
  const [date, setDate] = useState(toLocalISODate(new Date()))
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')

  const fetchAppointments = () => {
    setLoading(true)
    axiosClient.get('/v1/appointments/daily-schedule', { params: { date } })
      .then(res => setAppointments((res.data || []).filter(a => STATUS_ACTIVE.includes(a.status))))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAppointments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const isToday = date === toLocalISODate(new Date())
  const goDay = (delta) => {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    setDate(toLocalISODate(d))
  }
  const goToday = () => setDate(toLocalISODate(new Date()))

  const filtered = useMemo(() => {
    const q = stripDiacritics(searchText.trim())
    return appointments.filter(a => {
      if (filterStatus !== 'ALL' && a.status !== filterStatus) return false
      if (!q) return true
      return stripDiacritics(a.patientName).includes(q)
    })
  }, [appointments, searchText, filterStatus])

  const stats = useMemo(() => ({
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'PENDING').length,
    confirmed: appointments.filter(a => a.status === 'CONFIRMED').length,
    waiting: appointments.filter(a => a.status === 'WAITING').length,
  }), [appointments])

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={pageTitle}>Chuyển lịch hẹn</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Đổi bác sĩ hoặc thời gian cho các lịch hẹn đang hoạt động</p>
        </div>

        {/* Toolbar: điều hướng ngày + tìm kiếm + bộ lọc trạng thái */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
              <button onClick={() => goDay(-1)} style={{ padding: '8px 12px', border: 'none', background: '#fff', cursor: 'pointer', borderRight: '1px solid #e2e8f0' }}>‹</button>
              <button onClick={goToday} disabled={isToday} style={{ padding: '8px 14px', border: 'none', background: '#fff', cursor: isToday ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, color: '#2563eb', borderRight: '1px solid #e2e8f0' }}>Hôm nay</button>
              <button onClick={() => goDay(1)} style={{ padding: '8px 12px', border: 'none', background: '#fff', cursor: 'pointer' }}>›</button>
            </div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Tìm bệnh nhân theo tên..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', minWidth: 220 }}
            />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' }}>
              <option value="ALL">Tất cả trạng thái</option>
              {Object.entries(STATUS_INFO).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>
            <button onClick={fetchAppointments} disabled={loading}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: loading ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, color: '#374151' }}>
              {loading ? 'Đang tải...' : '↻ Làm mới'}
            </button>
          </div>
        </div>

        {/* Thống kê nhanh, cùng phong cách với dashboard lễ tân */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Tổng cộng', value: stats.total, color: '#6366f1', bg: '#e0e7ff' },
            { label: 'Chờ xác nhận', value: stats.pending, color: STATUS_INFO.PENDING.color, bg: STATUS_INFO.PENDING.bg },
            { label: 'Đã xác nhận', value: stats.confirmed, color: STATUS_INFO.CONFIRMED.color, bg: STATUS_INFO.CONFIRMED.bg },
            { label: 'Chờ khám', value: stats.waiting, color: STATUS_INFO.WAITING.color, bg: STATUS_INFO.WAITING.bg },
          ].map(stat => (
            <div key={stat.label} style={{ background: stat.bg, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: stat.color, opacity: 0.85 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <p style={{ color: '#64748b' }}>Không có lịch hẹn nào cần chuyển trong ngày này</p>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Giờ', 'Bệnh nhân', 'Bác sĩ hiện tại', 'Loại', 'Trạng thái', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => {
                  const info = STATUS_INFO[a.status] || { label: a.status, color: '#6b7280', bg: '#f3f4f6' }
                  const type = TYPE_INFO[a.type] || { label: a.type || '—', color: '#6b7280', bg: '#f3f4f6' }
                  return (
                    <tr key={a.id} onClick={() => navigate(`/manager/reassign-appointment/${a.id}`)}
                      style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1e293b' }}>{formatTime(a.appointmentTime)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{a.patientName}</td>
                      <td style={{ padding: '10px 14px', fontSize: 14, color: '#374151' }}>{a.doctorName || 'Chưa phân công'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, background: type.bg, color: type.color, padding: '2px 7px', borderRadius: 8, fontWeight: 600 }}>{type.label}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: info.bg, color: info.color, padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>{info.label}</span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/manager/reassign-appointment/${a.id}`) }}
                          style={{ background: '#fef3c7', color: '#d97706', border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                          Chuyển lịch
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
