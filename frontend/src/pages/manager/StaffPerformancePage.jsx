// UC-52: KPI hiệu suất bác sĩ theo kỳ.
import { useEffect, useState } from 'react'
import { reportService } from '../../services/reportService'

const th = { textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }
const td = { padding: 8, borderBottom: '1px solid #e2e8f0' }

function firstOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function StaffPerformancePage() {
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(today())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const res = await reportService.staffPerformance(from, to)
      setRows(res.data || [])
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được dữ liệu')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ padding: 24 }}>
      <h2>Hiệu suất nhân viên</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
        <label>Từ ngày<br /><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>Đến ngày<br /><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button onClick={load} disabled={loading} style={{ padding: '6px 16px' }}>{loading ? 'Đang tải…' : 'Xem'}</button>
      </div>
      {error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{error}</div>}

      <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 800 }}>
        <thead>
          <tr>
            <th style={th}>Bác sĩ</th>
            <th style={th}>Chuyên khoa</th>
            <th style={{ ...th, textAlign: 'right' }}>BN đã khám</th>
            <th style={{ ...th, textAlign: 'right' }}>Số đơn thuốc</th>
            <th style={{ ...th, textAlign: 'right' }}>TG khám TB</th>
            <th style={{ ...th, textAlign: 'right' }}>Tỉ lệ đúng giờ</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td style={td} colSpan={6}>Không có dữ liệu</td></tr>
          ) : rows.map((r) => (
            <tr key={r.doctorId}>
              <td style={td}>{r.doctorName}</td>
              <td style={td}>{r.role || '—'}</td>
              <td style={{ ...td, textAlign: 'right' }}>{r.patientsSeen}</td>
              <td style={{ ...td, textAlign: 'right' }}>{r.prescriptionVolume}</td>
              <td style={{ ...td, textAlign: 'right' }}>{r.avgConsultationMinutes != null ? `${r.avgConsultationMinutes} phút` : '—'}</td>
              <td style={{ ...td, textAlign: 'right' }}>{r.onTimeRate != null ? `${(r.onTimeRate * 100).toFixed(0)}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 10 }}>
        * TG khám TB = trung bình (thời điểm khóa bệnh án − thời điểm mở bệnh án) của các ca đã hoàn tất.
        Tỉ lệ đúng giờ = tỉ lệ lịch hẹn có giờ check-in không trễ hơn giờ hẹn. Dấu "—" nghĩa là chưa có dữ liệu trong kỳ.
      </p>
    </div>
  )
}
