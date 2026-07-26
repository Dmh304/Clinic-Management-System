/**
 * @author  ThangNB - HE201024
 * @created 2026-07-19
 * @updated 2026-07-20
 *
 * Patient statistics for the Clinic Manager (UC-51 View Patient Statistics):
 * total visits, new vs returning patients, appointment status distribution,
 * appointments per doctor and the top diagnoses.
 *
 * Read-only screen — no business rule is applied here.
 */
import { useEffect, useState } from 'react'
import { FiRefreshCw, FiDownload, FiCalendar, FiUsers, FiUserPlus, FiTrendingUp, FiTrendingDown, FiMinus, FiMoreHorizontal, FiActivity } from 'react-icons/fi'
import { FaNotesMedical, FaHistory } from 'react-icons/fa'
import { reportService, downloadBlob } from '../../services/reportService'

// Bảng màu theo DESIGN.md
const C = { primary: '#7c3aed', secondary: '#00687a', tertiary: '#b45309', error: '#ba1a1a', success: '#10b981', ink: '#121c2a', muted: '#4a4455', border: '#e5e7eb', track: '#f1f5f9' }
const STATUS_COLOR = { COMPLETED: C.primary, IN_PROGRESS: C.secondary, WAITING: '#f59e0b', CONFIRMED: '#a78bfa', CANCELLED: C.error, PENDING: '#94a3b8' }
const DOC_COLORS = [C.primary, C.secondary, '#f59e0b', '#0ea5e9', '#ec4899']
const DX_COLORS = ['#b45309', C.primary, C.secondary, C.tertiary, '#64748b']

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const initials = (name) => (name || '').replace(/^BS\.?\s*/i, '').split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase()

const card = { background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }
const bar = (color, pct) => (
  <div style={{ background: C.track, height: 10, borderRadius: 999, overflow: 'hidden' }}>
    <div style={{ width: `${Math.max(3, pct)}%`, height: '100%', background: color, borderRadius: 999 }} />
  </div>
)

function Trend({ delta }) {
  if (delta == null) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: 12 }}><FiMinus size={14} /> Ổn định</span>
  const good = delta >= 0
  const Icon = good ? FiTrendingUp : FiTrendingDown
  const color = good ? C.success : C.error
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color, fontSize: 12, fontWeight: 600 }}><Icon size={14} /> {good ? '+' : ''}{delta}% so với kỳ trước</span>
}

function Metric({ label, value, color, Icon, iconBg, delta }) {
  return (
    <div style={{ ...card, padding: 24, flex: '1 1 200px', minWidth: 200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: C.muted, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 10, background: iconBg, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={22} /></div>
      </div>
      <div style={{ marginTop: 16 }}><Trend delta={delta} /></div>
    </div>
  )
}

function firstOfMonth() { const d = new Date(); return iso(new Date(d.getFullYear(), d.getMonth(), 1)) }
function todayStr() { return iso(new Date()) }

/**
 * Renders the patient statistics screen and its export action.
 * @returns {JSX.Element} the statistics screen
 */
export default function PatientStatisticsPage() {
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(todayStr())
  const [data, setData] = useState(null)
  const [prev, setPrev] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /** Loads the statistics for the selected period (UC-51 step 3). */
  const load = async () => {
    setLoading(true); setError('')
    try {
      const f = new Date(from), t = new Date(to)
      const len = Math.max(1, Math.round((t - f) / 86400000) + 1)
      const pt = new Date(f); pt.setDate(f.getDate() - 1)
      const pf = new Date(pt); pf.setDate(pt.getDate() - len + 1)
      const [cur, pr] = await Promise.all([
        reportService.patientStatistics(from, to),
        reportService.patientStatistics(iso(pf), iso(pt)),
      ])
      setData(cur.data || {}); setPrev(pr.data || {})
    } catch (e) { setError(e?.response?.data?.message || 'Không tải được thống kê') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const delta = (cur, p) => (p ? Math.round(((cur - p) / p) * 100) : null)
  const statusEntries = Object.entries(data?.appointmentsByStatus || {})
  const totalAppt = data?.totalAppointments || statusEntries.reduce((s, [, v]) => s + v, 0) || 1
  const docEntries = Object.entries(data?.appointmentsByDoctor || {})
  const maxDoc = Math.max(1, ...docEntries.map(([, v]) => v))
  const diagnoses = data?.topDiagnoses || []
  const maxDx = Math.max(1, ...diagnoses.map((d) => d.count))
  const newPct = data && data.distinctPatients ? Math.round((data.newPatients / data.distinctPatients) * 100) : 0

  const dateBox = (label, value, onChange) => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: C.muted }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <FiCalendar size={14} color={C.primary} />
        <input type="date" value={value} onChange={(e) => onChange(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 700, color: C.ink, fontSize: 13 }} />
      </span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9ff', color: C.ink }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, padding: '20px 32px' }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>Thống kê bệnh nhân</div>
          <div style={{ color: C.muted, fontSize: 14 }}>Phân tích dữ liệu bệnh nhân thực tế theo thời gian</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#eff4ff', border: `1px solid ${C.border}`, borderRadius: 12, padding: '8px 16px' }}>
            {dateBox('Từ ngày', from, setFrom)}
            <div style={{ width: 1, height: 32, background: C.border }} />
            {dateBox('Đến ngày', to, setTo)}
          </div>
          <button onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.primary, color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>
            <FiRefreshCw size={16} /> {loading ? 'Đang tải…' : 'Tải lại'}
          </button>
          <button onClick={async () => { const blob = await reportService.exportPatientStatistics(from, to); downloadBlob(blob, 'thong-ke-benh-nhan.csv') }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.success, color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>
            <FiDownload size={16} /> Xuất Excel
          </button>
        </div>
      </div>

      <div style={{ padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {error && <div style={{ color: C.error }}>{error}</div>}

        {data && (
          <>
            {/* 4 thẻ */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              <Metric label="Tổng lượt khám" value={data.totalAppointments} color={C.primary} Icon={FaNotesMedical} iconBg="#f3e8ff" delta={delta(data.totalAppointments, prev?.totalAppointments)} />
              <Metric label="Bệnh nhân" value={data.distinctPatients} color={C.secondary} Icon={FiUsers} iconBg="#cffafe" delta={delta(data.distinctPatients, prev?.distinctPatients)} />
              <Metric label="Bệnh nhân mới" value={data.newPatients} color={C.tertiary} Icon={FiUserPlus} iconBg="#ffedd5" delta={delta(data.newPatients, prev?.newPatients)} />
              <Metric label="Bệnh nhân cũ" value={data.returningPatients} color={C.error} Icon={FaHistory} iconBg="#ffdad6" delta={delta(data.returningPatients, prev?.returningPatients)} />
            </div>

            {/* 2 biểu đồ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
              {/* Trạng thái */}
              <div style={{ ...card, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>Lịch hẹn theo trạng thái</div>
                  <FiMoreHorizontal color="#94a3b8" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {statusEntries.length === 0 ? <div style={{ color: '#94a3b8' }}>Không có dữ liệu</div> : statusEntries.map(([k, v]) => {
                    const pct = Math.round((v / totalAppt) * 100)
                    return (
                      <div key={k}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                          <span style={{ color: C.muted }}>{k}</span>
                          <span style={{ fontWeight: 700 }}>{v} ({pct}%)</span>
                        </div>
                        {bar(STATUS_COLOR[k] || '#94a3b8', pct)}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Theo bác sĩ */}
              <div style={{ ...card, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>Lịch hẹn theo bác sĩ</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {docEntries.length === 0 ? <div style={{ color: '#94a3b8' }}>Không có dữ liệu</div> : docEntries.map(([name, v], i) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: `${DOC_COLORS[i % DOC_COLORS.length]}22`, color: DOC_COLORS[i % DOC_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{initials(name) || 'BS'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>BS. {name}</span>
                          <span style={{ fontSize: 18, fontWeight: 800, color: DOC_COLORS[i % DOC_COLORS.length] }}>{v}</span>
                        </div>
                        {bar(DOC_COLORS[i % DOC_COLORS.length], (v / maxDoc) * 100)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top chẩn đoán + ghi chú */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 24 }}>
              <div style={{ ...card, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ padding: 8, background: '#fff7ed', color: C.tertiary, borderRadius: 10, display: 'flex' }}><FiActivity size={18} /></div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>Top 5 chẩn đoán phổ biến nhất</div>
                </div>
                {diagnoses.length === 0 ? <div style={{ color: '#94a3b8' }}>Không có dữ liệu</div> : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
                    {diagnoses.map((d, i) => (
                      <div key={i} style={{ borderLeft: `4px solid ${DX_COLORS[i % DX_COLORS.length]}`, paddingLeft: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.diagnosis}>{d.diagnosis}</span>
                          <span style={{ background: `${DX_COLORS[i % DX_COLORS.length]}22`, color: DX_COLORS[i % DX_COLORS.length], fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>{d.count} ca</span>
                        </div>
                        {bar(DX_COLORS[i % DX_COLORS.length], (d.count / maxDx) * 100)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ghi chú phân tích */}
              <div style={{ background: `linear-gradient(135deg, ${C.primary}, #630ed4)`, color: '#fff', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <FiTrendingUp size={40} style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Ghi chú phân tích</div>
                  <p style={{ opacity: 0.9, lineHeight: 1.6, fontSize: 14 }}>
                    Trong kỳ có <b>{data.totalAppointments}</b> lượt khám của <b>{data.distinctPatients}</b> bệnh nhân,
                    trong đó bệnh nhân mới chiếm <b>{newPct}%</b>. {newPct >= 50
                      ? 'Nguồn bệnh nhân mới đang tốt — nên tập trung chuyển đổi họ thành khách tái khám qua các gói dịch vụ.'
                      : 'Tỉ lệ bệnh nhân cũ cao — dấu hiệu giữ chân khách tốt; cân nhắc đẩy mạnh thu hút bệnh nhân mới.'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
