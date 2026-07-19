// UC-51: Thống kê bệnh nhân theo kỳ.
import { useEffect, useState } from 'react'
import { reportService } from '../../services/reportService'

const th = { textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }
const td = { padding: 8, borderBottom: '1px solid #e2e8f0' }
const stat = { flex: '1 1 160px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px' }
const big = { fontSize: 26, fontWeight: 700, color: '#4f46e5' }

function firstOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function CountTable({ title, obj }) {
  const rows = Object.entries(obj || {})
  return (
    <div style={{ flex: '1 1 260px' }}>
      <h4>{title}</h4>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead><tr><th style={th}>Mục</th><th style={{ ...th, textAlign: 'right' }}>Số lượng</th></tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td style={td} colSpan={2}>Không có dữ liệu</td></tr>
            : rows.map(([k, v]) => <tr key={k}><td style={td}>{k}</td><td style={{ ...td, textAlign: 'right' }}>{v}</td></tr>)}
        </tbody>
      </table>
    </div>
  )
}

export default function PatientStatisticsPage() {
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(today())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const res = await reportService.patientStatistics(from, to)
      setData(res.data || {})
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được thống kê')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ padding: 24 }}>
      <h2>Thống kê bệnh nhân</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
        <label>Từ ngày<br /><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>Đến ngày<br /><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button onClick={load} disabled={loading} style={{ padding: '6px 16px' }}>{loading ? 'Đang tải…' : 'Xem'}</button>
      </div>
      {error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{error}</div>}

      {data && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
            <div style={stat}><div style={big}>{data.totalAppointments}</div><div style={{ color: '#64748b' }}>Tổng lượt khám</div></div>
            <div style={stat}><div style={big}>{data.distinctPatients}</div><div style={{ color: '#64748b' }}>Bệnh nhân</div></div>
            <div style={stat}><div style={big}>{data.newPatients}</div><div style={{ color: '#64748b' }}>Bệnh nhân mới</div></div>
            <div style={stat}><div style={big}>{data.returningPatients}</div><div style={{ color: '#64748b' }}>Bệnh nhân cũ</div></div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            <CountTable title="Lịch hẹn theo trạng thái" obj={data.appointmentsByStatus} />
            <CountTable title="Lịch hẹn theo bác sĩ" obj={data.appointmentsByDoctor} />
            <div style={{ flex: '1 1 260px' }}>
              <h4>Top chẩn đoán</h4>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead><tr><th style={th}>Chẩn đoán</th><th style={{ ...th, textAlign: 'right' }}>Số ca</th></tr></thead>
                <tbody>
                  {(data.topDiagnoses || []).length === 0 ? <tr><td style={td} colSpan={2}>Không có dữ liệu</td></tr>
                    : data.topDiagnoses.map((d, i) => <tr key={i}><td style={td}>{d.diagnosis}</td><td style={{ ...td, textAlign: 'right' }}>{d.count}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
