/**
 * @author      ThangNB - HE201024
 * @contributor Đồng Mạnh Hùng - HE200743
 * @created     2026-07-19
 * @updated     2026-07-20
 *
 * Revenue report for the Clinic Manager (UC-50 Generate Revenue Report):
 * headline totals, monthly trend, breakdown by service category / doctor /
 * payment method, and the paid-invoice detail list.
 *
 * Figures come only from PAID invoices, so what is shown is money actually
 * collected under BR-10 rather than amounts merely billed.
 * Export produces UTF-8 CSV, a deviation from the .xlsx named in UC-50 step 6.
 */
import { useEffect, useState } from 'react'
import { FiEye, FiDownload, FiRefreshCw } from 'react-icons/fi'
import { reportService, downloadBlob } from '../../services/reportService'

const vnd = (v) => `${Number(v || 0).toLocaleString('vi-VN')}đ`
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#8b5cf6']

const SERVICE_LABEL = { SERVICE: 'Dịch vụ khám', LAB: 'Xét nghiệm', MEDICINE: 'Thuốc' }
const METHOD_LABEL = { CASH: 'Tiền mặt', VIET_QR: 'QR Code', UNKNOWN: 'Khác' }

const card = { background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }

function StatCard({ label, value, sub, highlight }) {
  return (
    <div style={{ flex: '1 1 220px', minWidth: 220, borderRadius: 16, padding: '20px 22px',
      background: highlight ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#fff',
      color: highlight ? '#fff' : '#0f172a', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 13, color: highlight ? 'rgba(255,255,255,.85)' : '#64748b' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, marginTop: 6, color: highlight ? 'rgba(255,255,255,.8)' : '#94a3b8' }}>{sub}</div>}
    </div>
  )
}

// Biểu đồ cột xu hướng theo tháng
function TrendChart({ trend }) {
  const max = Math.max(1, ...trend.map((t) => Number(t.revenue) || 0))
  const ticks = [0, 0.28, 0.5, 0.78, 1].map((r) => Math.round((max * r) / 1e6))
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-between', height: 200, color: '#cbd5e1', fontSize: 11 }}>
        {ticks.map((t, i) => <div key={i}>{t}M</div>)}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 8, height: 200, borderLeft: '1px solid #f1f5f9', paddingLeft: 8 }}>
        {trend.map((t, i) => {
          const isLast = i === trend.length - 1
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <div title={vnd(t.revenue)} style={{ width: '60%', maxWidth: 40, height: `${(Number(t.revenue) / max) * 100}%`,
                background: isLast ? '#4f46e5' : '#c7d2fe', borderRadius: '6px 6px 0 0', minHeight: 2 }} />
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>T{t.month}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Panel breakdown: mỗi dòng có chấm màu, nhãn, số tiền, thanh %
function Breakdown({ title, rows }) {
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0) || 1
  return (
    <div style={{ ...card, flex: '1 1 300px', minWidth: 300, padding: '20px 22px' }}>
      <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 14 }}>{title}</div>
      {rows.length === 0 ? <div style={{ color: '#94a3b8' }}>Không có dữ liệu</div> : rows.map((r, i) => {
        const pct = Math.round((Number(r.amount) / total) * 100)
        return (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], marginRight: 8 }} />
                <b>{r.label}</b> {r.tag && <span style={{ color: '#94a3b8', fontSize: 12 }}>({r.tag})</span>}
              </div>
              <div style={{ fontWeight: 700 }}>{vnd(r.amount)}</div>
            </div>
            <div style={{ background: '#f1f5f9', borderRadius: 999, height: 8, marginTop: 6 }}>
              <div style={{ width: `${Math.max(2, pct)}%`, background: COLORS[i % COLORS.length], height: '100%', borderRadius: 999 }} />
            </div>
            <div style={{ textAlign: 'right', color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{pct}%</div>
          </div>
        )
      })}
    </div>
  )
}

// Donut phương thức thanh toán (conic-gradient)
function Donut({ byMethod }) {
  const entries = Object.entries(byMethod || {})
  const total = entries.reduce((s, [, v]) => s + Number(v || 0), 0) || 1
  let acc = 0
  const stops = entries.map(([k, v], i) => {
    const start = (acc / total) * 360; acc += Number(v || 0)
    const end = (acc / total) * 360
    return `${COLORS[i % COLORS.length]} ${start}deg ${end}deg`
  }).join(', ')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 200, height: 200, borderRadius: '50%', background: `conic-gradient(${stops || '#e2e8f0 0deg 360deg'})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 110, height: 110, borderRadius: '50%', background: '#fff' }} />
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        {entries.map(([k], i) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length] }} /> {k}
          </div>
        ))}
      </div>
    </div>
  )
}

const RANGES = [
  { key: 'day', label: 'Ngày' }, { key: 'week', label: 'Tuần' }, { key: 'month', label: 'Tháng' },
  { key: 'year', label: 'Năm' }, { key: 'custom', label: 'Tùy chỉnh' },
]

/**
 * Renders the revenue report and its export action.
 * @returns {JSX.Element} the report screen
 */
export default function RevenueReportPage() {
  const today = new Date()
  const [range, setRange] = useState('month')
  const [from, setFrom] = useState(iso(new Date(today.getFullYear(), today.getMonth(), 1)))
  const [to, setTo] = useState(iso(today))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /**
   * Applies a preset period (UC-50 normal flow step 2).
   * @param {'day'|'week'|'month'|'year'|'custom'} key preset; 'custom' leaves
   *   the dates alone so the manual pickers stay in control
   */
  const applyRange = (key) => {
    setRange(key)
    const now = new Date()
    if (key === 'day') { setFrom(iso(now)); setTo(iso(now)) }
    else if (key === 'week') { const s = new Date(now); s.setDate(now.getDate() - 6); setFrom(iso(s)); setTo(iso(now)) }
    else if (key === 'month') { setFrom(iso(new Date(now.getFullYear(), now.getMonth(), 1))); setTo(iso(now)) }
    else if (key === 'year') { setFrom(iso(new Date(now.getFullYear(), 0, 1))); setTo(iso(now)) }
  }

  /** Loads the revenue figures for the selected period (UC-50 step 3). */
  const load = async () => {
    setLoading(true); setError('')
    try {
      const res = await reportService.revenue(from, to)
      setData(res.data || {})
    } catch (e) { setError(e?.response?.data?.message || 'Không tải được báo cáo') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  const svcRows = Object.entries(data?.byServiceCategory || {}).map(([k, v]) => ({ label: SERVICE_LABEL[k] || k, tag: k, amount: v }))
  const docRows = Object.entries(data?.byDoctor || {}).map(([k, v]) => ({ label: `BS. ${k}`, amount: v }))
  const payRows = Object.entries(data?.byPaymentMethod || {}).map(([k, v]) => ({ label: METHOD_LABEL[k] || k, tag: k, amount: v }))
  const top = data?.topServiceCategory || {}
  const topDoc = data?.topDoctor || {}

  return (
    <div>
      {/* Breadcrumb + title */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eef0f6', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Reports › <span style={{ color: '#4f46e5' }}>Revenue Report</span></div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Báo cáo Doanh thu</h1>
        </div>
        <div style={{ color: '#94a3b8', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><FiEye /> Eyes Clinic Management System</div>
      </div>

      <div style={{ padding: 24 }}>
        {/* Filter */}
        <div style={{ ...card, padding: '18px 22px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Khoảng thời gian</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {RANGES.map((r) => (
                <button key={r.key} onClick={() => applyRange(r.key)}
                  style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
                    background: range === r.key ? '#4f46e5' : '#f1f5f9', color: range === r.key ? '#fff' : '#475569', fontWeight: range === r.key ? 600 : 400 }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <label style={{ fontSize: 12, color: '#64748b' }}>Từ ngày<br />
            <input type="date" value={from} onChange={(e) => { setRange('custom'); setFrom(e.target.value) }} style={{ padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 4 }} /></label>
          <label style={{ fontSize: 12, color: '#64748b' }}>Đến ngày<br />
            <input type="date" value={to} onChange={(e) => { setRange('custom'); setTo(e.target.value) }} style={{ padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 4 }} /></label>
          <div style={{ flex: 1 }} />
          <button onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4f46e5', cursor: 'pointer', fontWeight: 600 }}><FiRefreshCw /> {loading ? 'Đang tải…' : 'Tải lại'}</button>
          <button onClick={async () => { const blob = await reportService.exportRevenue(from, to); downloadBlob(blob, 'bao-cao-doanh-thu.xlsx') }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 600 }}><FiDownload /> Xuất Excel</button>
        </div>

        {error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{error}</div>}

        {data && (
          <>
            {/* 4 thẻ chỉ số */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
              <StatCard highlight label="Tổng doanh thu" value={vnd(data.totalRevenue)} sub={`${data.invoiceCount} hóa đơn đã thanh toán`} />
              <StatCard label="Doanh thu trung bình" value={vnd(data.averagePerInvoice)} sub="Mỗi hóa đơn" />
              <StatCard label="Nhóm DV cao nhất" value={SERVICE_LABEL[top.name] ? SERVICE_LABEL[top.name] : (top.name || '—')} sub={vnd(top.amount)} />
              <StatCard label="Bác sĩ doanh thu cao nhất" value={topDoc.name ? `BS. ${topDoc.name}` : '—'} sub={vnd(topDoc.amount)} />
            </div>

            {/* Xu hướng theo tháng */}
            <div style={{ ...card, padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Xu hướng doanh thu theo tháng</div>
              <TrendChart trend={data.monthlyTrend || []} />
            </div>

            {/* 3 breakdown */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
              <Breakdown title="Theo nhóm dịch vụ" rows={svcRows} />
              <Breakdown title="Theo bác sĩ" rows={docRows} />
              <Breakdown title="Theo phương thức thanh toán" rows={payRows} />
            </div>

            {/* Donut + bảng chi tiết */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ ...card, flex: '1 1 340px', minWidth: 340, padding: '20px 24px' }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Tỷ lệ phương thức thanh toán</div>
                <Donut byMethod={data.byPaymentMethod} />
              </div>
              <div style={{ ...card, flex: '2 1 500px', minWidth: 400, padding: '20px 24px' }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Chi tiết hóa đơn đã thanh toán</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: '#94a3b8', fontSize: 12, textAlign: 'left' }}>
                      <th style={{ padding: '8px 6px' }}>Hóa đơn</th><th style={{ padding: '8px 6px' }}>Bác sĩ</th>
                      <th style={{ padding: '8px 6px' }}>PT thanh toán</th><th style={{ padding: '8px 6px', textAlign: 'right' }}>Số tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.paidInvoices || []).length === 0 ? <tr><td colSpan={4} style={{ padding: 12, color: '#94a3b8' }}>Không có hóa đơn.</td></tr>
                      : data.paidInvoices.map((r, i) => (
                        <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 6px', color: '#4f46e5', fontWeight: 600 }}>{r.code}</td>
                          <td style={{ padding: '10px 6px' }}>BS. {r.doctorName}</td>
                          <td style={{ padding: '10px 6px' }}>
                            <span style={{ background: r.paymentMethod === 'CASH' ? '#fef3c7' : '#dcfce7', color: r.paymentMethod === 'CASH' ? '#b45309' : '#166534', borderRadius: 999, padding: '2px 10px', fontSize: 12 }}>
                              {METHOD_LABEL[r.paymentMethod] || r.paymentMethod}
                            </span>
                          </td>
                          <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700 }}>{vnd(r.amount)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
