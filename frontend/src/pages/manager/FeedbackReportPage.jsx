// UC-53: Báo cáo tổng hợp đánh giá của bệnh nhân.
import { useEffect, useState } from 'react'
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa'
import { FiRefreshCw, FiDownload, FiMessageSquare, FiCheckCircle, FiPercent, FiSearch } from 'react-icons/fi'
import { reportService, downloadBlob } from '../../services/reportService'

const C = { primary: '#7c3aed', secondary: '#00687a', success: '#059669', star: '#f59e0b', ink: '#121c2a', muted: '#4a4455', border: '#e5e7eb' }
const card = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }
const pct = (v) => (v == null ? '—' : (Number(v) * 100).toFixed(1) + '%')
const initials = (name) => (name || '').replace(/^(BS|ĐD|KTV)\.?\s*/i, '').split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase()
const firstOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` }
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

function Stars({ v, size = 14 }) {
  if (v == null) return <span style={{ color: C.muted }}>—</span>
  const val = Number(v)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        if (val >= i) return <FaStar key={i} size={size} color={C.star} />
        if (val >= i - 0.5) return <FaStarHalfAlt key={i} size={size} color={C.star} />
        return <FaRegStar key={i} size={size} color="#cbd5e1" />
      })}
    </span>
  )
}

function StatCard({ label, value, sub, Icon, iconBg, iconColor, children }) {
  return (
    <div style={{ ...card, padding: 24, flex: '1 1 220px', minWidth: 220 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, color: C.muted }}>{label}</span>
        <div style={{ padding: 8, borderRadius: 8, background: iconBg, color: iconColor, display: 'flex' }}><Icon size={20} /></div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.ink }}>{value}</div>
      {children}
      {sub && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

const th = { padding: '12px 16px', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600, color: C.muted, whiteSpace: 'nowrap', textAlign: 'left' }
const td = { padding: '12px 16px', fontSize: 14, borderTop: `1px solid ${C.border}` }

export default function FeedbackReportPage() {
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(today())
  const [data, setData] = useState(null)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try { const res = await reportService.feedbackReport(from, to); setData(res.data || {}) }
    catch (e) { setError(e?.response?.data?.message || 'Không tải được báo cáo') } finally { setLoading(false) }
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const byDoctor = (data?.byDoctor || [])
  const shown = q ? byDoctor.filter((r) => (r.doctorName || '').toLowerCase().includes(q.toLowerCase())) : byDoctor
  const btn = (bg, color, border) => ({ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: border || 'none', background: bg, color, cursor: 'pointer', fontWeight: 600, fontSize: 14 })

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9ff', color: C.ink }}>
      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>Báo cáo đánh giá</div>
            <div style={{ marginTop: 4, color: C.muted }}>Mức độ hài lòng của bệnh nhân theo kỳ & theo bác sĩ</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
            <label style={{ fontSize: 12, color: C.muted }}>Từ ngày<br /><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}` }} /></label>
            <label style={{ fontSize: 12, color: C.muted }}>Đến ngày<br /><input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}` }} /></label>
            <button onClick={load} disabled={loading} style={btn('#fff', C.primary, `1px solid ${C.primary}`)}><FiRefreshCw size={16} /> {loading ? 'Đang tải…' : 'Tải lại'}</button>
            <button onClick={async () => { const blob = await reportService.exportFeedback(from, to); downloadBlob(blob, 'bao-cao-danh-gia.csv') }} style={btn(C.success, '#fff')}><FiDownload size={16} /> Xuất Excel</button>
          </div>
        </div>

        {error && <div style={{ color: '#ba1a1a' }}>{error}</div>}

        {data && (
          <>
            {/* Thẻ tổng quan */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              <StatCard label="Điểm trung bình" value={data.averageRating != null ? Number(data.averageRating).toFixed(2) : '—'} Icon={FaStar} iconBg="#fef3c7" iconColor={C.star}>
                <div style={{ marginTop: 6 }}><Stars v={data.averageRating} size={16} /></div>
              </StatCard>
              <StatCard label="Số phản hồi" value={data.totalResponses ?? 0} sub="lượt đánh giá trong kỳ" Icon={FiMessageSquare} iconBg="#f3e8ff" iconColor={C.primary} />
              <StatCard label="Lịch đã hoàn thành" value={data.completedAppointments ?? 0} sub="buổi khám trong kỳ" Icon={FiCheckCircle} iconBg="#cffafe" iconColor={C.secondary} />
              <StatCard label="Tỉ lệ phản hồi" value={pct(data.responseRate)} sub="phản hồi / lịch hoàn thành" Icon={FiPercent} iconBg="#dcfce7" iconColor={C.success} />
            </div>

            {/* Bảng theo bác sĩ */}
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: '#fafbff' }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Điểm trung bình theo bác sĩ</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', width: 260 }}>
                  <FiSearch color="#94a3b8" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm bác sĩ…" style={{ border: 'none', outline: 'none', flex: 1, fontSize: 14 }} />
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fafbff' }}>
                      <th style={th}>Bác sĩ</th>
                      <th style={{ ...th, textAlign: 'center' }}>Số phản hồi</th>
                      <th style={th}>Đánh giá</th>
                      <th style={{ ...th, width: '30%' }}>Mức độ hài lòng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.length === 0 ? (
                      <tr><td style={{ ...td, color: C.muted }} colSpan={4}>Không có dữ liệu trong kỳ này.</td></tr>
                    ) : shown.map((r, i) => (
                      <tr key={i}>
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f3e8ff', color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{initials(r.doctorName) || 'BS'}</div>
                            <span style={{ fontWeight: 600 }}>{r.doctorName}</span>
                          </div>
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>{r.responses}</td>
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Stars v={r.averageRating} />
                            <span style={{ fontWeight: 700 }}>{Number(r.averageRating).toFixed(2)}</span>
                          </div>
                        </td>
                        <td style={td}>
                          <div style={{ height: 8, borderRadius: 999, background: '#eef2f7', overflow: 'hidden' }}>
                            <div style={{ width: `${(Number(r.averageRating) / 5) * 100}%`, height: '100%', borderRadius: 999, background: Number(r.averageRating) >= 4 ? C.success : Number(r.averageRating) >= 3 ? C.star : '#ba1a1a' }} />
                          </div>
                        </td>
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
