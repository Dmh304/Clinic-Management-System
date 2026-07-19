// UC-53: Báo cáo tổng hợp đánh giá của bệnh nhân.
import { useEffect, useState } from 'react'
import { reportService } from '../../services/reportService'

const th = { textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }
const td = { padding: 8, borderBottom: '1px solid #e2e8f0' }
const stat = { flex: '1 1 160px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px' }
const big = { fontSize: 26, fontWeight: 700, color: '#f59e0b' }

function firstOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const pct = (v) => (v == null ? '—' : (Number(v) * 100).toFixed(1) + '%')
const stars = (v) => (v == null ? '—' : Number(v).toFixed(2) + '★')

export default function FeedbackReportPage() {
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(today())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const res = await reportService.feedbackReport(from, to)
      setData(res.data || {})
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được báo cáo')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ padding: 24 }}>
      <h2>Báo cáo đánh giá</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
        <label>Từ ngày<br /><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>Đến ngày<br /><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button onClick={load} disabled={loading} style={{ padding: '6px 16px' }}>{loading ? 'Đang tải…' : 'Xem'}</button>
      </div>
      {error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{error}</div>}

      {data && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
            <div style={stat}><div style={big}>{stars(data.averageRating)}</div><div style={{ color: '#64748b' }}>Điểm trung bình</div></div>
            <div style={stat}><div style={big}>{data.totalResponses}</div><div style={{ color: '#64748b' }}>Số phản hồi</div></div>
            <div style={stat}><div style={big}>{pct(data.responseRate)}</div><div style={{ color: '#64748b' }}>Tỉ lệ phản hồi</div></div>
          </div>
          <h4>Điểm trung bình theo bác sĩ</h4>
          <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 600 }}>
            <thead><tr><th style={th}>Bác sĩ</th><th style={{ ...th, textAlign: 'right' }}>Số phản hồi</th><th style={{ ...th, textAlign: 'right' }}>Điểm TB</th></tr></thead>
            <tbody>
              {(data.byDoctor || []).length === 0 ? <tr><td style={td} colSpan={3}>Không có dữ liệu</td></tr>
                : data.byDoctor.map((r, i) => (
                  <tr key={i}><td style={td}>{r.doctorName}</td><td style={{ ...td, textAlign: 'right' }}>{r.responses}</td><td style={{ ...td, textAlign: 'right' }}>{stars(r.averageRating)}</td></tr>
                ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
