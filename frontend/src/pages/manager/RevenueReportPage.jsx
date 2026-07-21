// UC-50: Báo cáo doanh thu theo kỳ (dịch vụ / bác sĩ / phương thức thanh toán).
import { useEffect, useState } from 'react'
import { reportService, downloadBlob } from '../../services/reportService'

const vnd = (v) => (v == null ? '0' : Number(v).toLocaleString('vi-VN')) + '₫'
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

function BreakdownTable({ title, obj }) {
  const rows = Object.entries(obj || {})
  return (
    <div style={{ flex: '1 1 280px' }}>
      <h4>{title}</h4>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead><tr><th style={th}>Mục</th><th style={{ ...th, textAlign: 'right' }}>Doanh thu</th></tr></thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td style={td} colSpan={2}>Không có dữ liệu</td></tr>
          ) : rows.map(([k, v]) => (
            <tr key={k}><td style={td}>{k}</td><td style={{ ...td, textAlign: 'right' }}>{vnd(v)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function RevenueReportPage() {
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(today())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const res = await reportService.revenue(from, to)
      setData(res.data || {})
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được báo cáo')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ padding: 24 }}>
      <h2>Báo cáo doanh thu</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
        <label>Từ ngày<br /><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>Đến ngày<br /><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button onClick={load} disabled={loading} style={{ padding: '6px 16px' }}>{loading ? 'Đang tải…' : 'Xem'}</button>
        <button onClick={async () => { const blob = await reportService.exportRevenue(from, to); downloadBlob(blob, 'bao-cao-doanh-thu.csv') }}
          style={{ padding: '6px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 4 }}>
          Xuất Excel
        </button>
      </div>
      {error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{error}</div>}

      {data && (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <div style={{ background: '#4f46e5', color: '#fff', borderRadius: 10, padding: '18px 24px' }}>
              <div style={{ fontSize: 30, fontWeight: 700 }}>{vnd(data.totalRevenue)}</div>
              <div style={{ opacity: 0.85 }}>Tổng doanh thu · {data.invoiceCount} hóa đơn</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            <BreakdownTable title="Theo nhóm dịch vụ" obj={data.byServiceCategory} />
            <BreakdownTable title="Theo bác sĩ" obj={data.byDoctor} />
            <BreakdownTable title="Theo phương thức thanh toán" obj={data.byPaymentMethod} />
          </div>
        </>
      )}
    </div>
  )
}
