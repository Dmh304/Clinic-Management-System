/**
 * @author      ThangNB - HE201024
 * @contributor Đồng Mạnh Hùng - HE200743
 * @created     2026-07-19
 * @updated     2026-07-20
 *
 * Staff performance dashboard for the Clinic Manager
 * (UC-52 Monitor Staff Performance Dashboard): comparison charts plus a
 * per-doctor KPI table — patients seen, average consultation time,
 * prescription volume and on-time rate.
 *
 * The two time-based KPIs are approximations: the schema stores no explicit
 * consultation start/end, so average duration is derived from when the doctor
 * locked the EMR and the on-time rate from check-in versus scheduled time.
 */
import { useEffect, useMemo, useState } from 'react'
import { FiClock } from 'react-icons/fi'
import { reportService } from '../../services/reportService'

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const shortName = (name) => (name || '').split(' ').filter(Boolean).slice(-1)[0] || name
const initials = (name) => (name || '').replace(/^BS\.?\s*/i, '').split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase()

const AVATAR = ['#7c3aed', '#10b981', '#f39c12', '#ef4444', '#03a9f4', '#8b5cf6']
const SERIES = [
  { key: 'patientsSeen', label: 'BN đã khám', color: '#7c3aed', val: (r) => Number(r.patientsSeen) || 0 },
  { key: 'prescriptionVolume', label: 'Đơn thuốc', color: '#10b981', val: (r) => Number(r.prescriptionVolume) || 0 },
  { key: 'onTime', label: 'Đúng giờ (%)', color: '#38bdf8', val: (r) => (r.onTimeRate != null ? Math.round(r.onTimeRate * 100) : 0) },
]
const RANGES = {
  week: { label: 'Tuần này', range: () => { const n = new Date(); const s = new Date(n); s.setDate(n.getDate() - 6); return [s, n] } },
  month: { label: 'Tháng này', range: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth(), 1), n] } },
  year: { label: 'Năm nay', range: () => { const n = new Date(); return [new Date(n.getFullYear(), 0, 1), n] } },
}
/**
 * Colour band for the on-time rate: green ≥ 95%, amber ≥ 85%, red below.
 * @param {number} p on-time percentage
 * @returns {string} hex colour
 */
const onTimeColor = (p) => (p >= 95 ? '#10b981' : p >= 85 ? '#e67e22' : '#ef4444')

// Hệ tọa độ dùng chung cho cả hai kiểu biểu đồ, nhờ vậy đổi Cột ↔ Đường thì vị trí
// và cách đọc số liệu không đổi. padL chừa chỗ cho nhãn trục dọc, padB cho tên bác sĩ.
const CHART = { w: 760, h: 260, padL: 46, padR: 12, padT: 12, padB: 30 }

/** Làm tròn trần lên số "đẹp" để vạch chia không ra 3,7 hay 7,4. */
function niceMax(v) {
  if (v <= 5) return 5
  const mag = 10 ** Math.floor(Math.log10(v))
  const n = v / mag
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag
}

/**
 * Trục dọc có vạch chia + đường kẻ ngang, trục ngang có tên bác sĩ.
 *
 * Thiếu phần này thì biểu đồ chỉ cho biết cột nào cao hơn cột nào, không đọc được
 * giá trị thật — đó là lý do tách ra vẽ chung cho cả hai kiểu.
 *
 * @param {Object}   props
 * @param {number}   props.max    giá trị lớn nhất của trục dọc (đã làm tròn đẹp)
 * @param {string[]} props.labels nhãn trục ngang
 * @param {Function} props.xOf    tọa độ x theo chỉ số cột
 */
function Axes({ max, labels, xOf }) {
  const { w, h, padL, padR, padT, padB } = CHART
  const TICKS = 4
  return (
    <>
      {Array.from({ length: TICKS + 1 }, (_, i) => {
        const v = (max / TICKS) * i
        const y = h - padB - (v / max) * (h - padT - padB)
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke={i === 0 ? '#cbd5e1' : '#f1f5f9'} />
            <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{Math.round(v)}</text>
          </g>
        )
      })}
      <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke="#cbd5e1" />
      {labels.map((l, i) => (
        <text key={i} x={xOf(i)} y={h - padB + 18} textAnchor="middle" fontSize="12" fill="#64748b">{l}</text>
      ))}
    </>
  )
}

function GroupedBars({ rows }) {
  const { w, h, padL, padR, padT, padB } = CHART
  const max = niceMax(Math.max(1, ...rows.flatMap((r) => SERIES.map((s) => s.val(r)))))
  const band = (w - padL - padR) / Math.max(1, rows.length)
  const barW = Math.max(6, Math.min(18, (band - 16) / SERIES.length))
  const xOf = (i) => padL + band * (i + 0.5)
  const yOf = (v) => h - padB - (v / max) * (h - padT - padB)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%' }}>
      <Axes max={max} labels={rows.map((r) => shortName(r.doctorName))} xOf={xOf} />
      {rows.map((r, i) => SERIES.map((s, j) => {
        const v = s.val(r)
        const x = xOf(i) - (SERIES.length * barW) / 2 + j * barW
        return (
          <rect key={s.key + i} x={x} y={yOf(v)} width={barW - 2} height={Math.max(1, h - padB - yOf(v))}
            fill={s.color} rx="3">
            <title>{`${r.doctorName} · ${s.label}: ${v}`}</title>
          </rect>
        )
      }))}
    </svg>
  )
}

function LineChart({ rows }) {
  const { w, h, padL, padR, padT, padB } = CHART
  const max = niceMax(Math.max(1, ...rows.flatMap((r) => SERIES.map((s) => s.val(r)))))
  // Một điểm duy nhất thì đặt giữa khung, tránh chia cho 0 khi chỉ lọc 1 bác sĩ.
  const xOf = (i) => (rows.length <= 1
    ? padL + (w - padL - padR) / 2
    : padL + (i * (w - padL - padR)) / (rows.length - 1))
  const yOf = (v) => h - padB - (v / max) * (h - padT - padB)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%' }}>
      <Axes max={max} labels={rows.map((r) => shortName(r.doctorName))} xOf={xOf} />
      {SERIES.map((s) => (
        <polyline key={s.key} fill="none" stroke={s.color} strokeWidth="2.5"
          points={rows.map((r, i) => `${xOf(i)},${yOf(s.val(r))}`).join(' ')} />
      ))}
      {SERIES.flatMap((s) => rows.map((r, i) => (
        <circle key={s.key + i} cx={xOf(i)} cy={yOf(s.val(r))} r="3.5" fill={s.color}>
          <title>{`${r.doctorName} · ${s.label}: ${s.val(r)}`}</title>
        </circle>
      )))}
    </svg>
  )
}

/**
 * Renders the staff performance dashboard.
 * @returns {JSX.Element} the KPI screen
 */
export default function StaffPerformancePage() {
  const [rangeKey, setRangeKey] = useState('month')
  const [staff, setStaff] = useState('ALL')
  const [chartType, setChartType] = useState('bar')
  const [rows, setRows] = useState([])
  const [prevRows, setPrevRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /** Loads per-doctor KPIs for the selected period (UC-52 steps 3-4). */
  const load = async () => {
    setLoading(true); setError('')
    try {
      const [from, to] = RANGES[rangeKey].range()
      const len = Math.round((to - from) / 86400000) + 1
      const pTo = new Date(from); pTo.setDate(from.getDate() - 1)
      const pFrom = new Date(pTo); pFrom.setDate(pTo.getDate() - len + 1)
      const [cur, prev] = await Promise.all([
        reportService.staffPerformance(iso(from), iso(to)),
        reportService.staffPerformance(iso(pFrom), iso(pTo)),
      ])
      setRows(cur.data || [])
      setPrevRows(prev.data || [])
    } catch (e) { setError(e?.response?.data?.message || 'Không tải được dữ liệu') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [rangeKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => (staff === 'ALL' ? rows : rows.filter((r) => String(r.doctorId) === staff)), [rows, staff])
  const prevMap = useMemo(() => Object.fromEntries(prevRows.map((r) => [r.doctorId, r])), [prevRows])
  const trend = (r) => {
    const p = prevMap[r.doctorId]
    if (!p || !p.patientsSeen) return null
    return Math.round(((r.patientsSeen - p.patientsSeen) / p.patientsSeen) * 100)
  }

  const th = { padding: '0 8px 20px', color: '#94a3b8', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600, textAlign: 'left' }
  const td = { padding: '18px 8px', borderTop: '1px solid #f8fafc' }

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Hiệu suất nhân viên</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Theo dõi KPI và năng suất của đội ngũ bác sĩ</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={rangeKey} onChange={(e) => setRangeKey(e.target.value)} style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            {Object.entries(RANGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={staff} onChange={(e) => setStaff(e.target.value)} style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <option value="ALL">Tất cả nhân viên</option>
            {rows.map((r) => <option key={r.doctorId} value={String(r.doctorId)}>BS. {r.doctorName}</option>)}
          </select>
        </div>
      </div>

      <div style={{ padding: '20px 24px 24px' }}>
        {error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{error}</div>}

        {/* Biểu đồ so sánh */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 24 }}>
              {SERIES.map((s) => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                  <span style={{ width: 12, height: 12, borderRadius: 4, background: s.color }} /> {s.label}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 3 }}>
              {[['bar', 'Cột'], ['line', 'Đường']].map(([k, l]) => (
                <button key={k} onClick={() => setChartType(k)} style={{ border: 'none', cursor: 'pointer', padding: '6px 16px', borderRadius: 8, fontSize: 13,
                  background: chartType === k ? '#fff' : 'transparent', color: chartType === k ? '#0f172a' : '#64748b', fontWeight: chartType === k ? 600 : 400, boxShadow: chartType === k ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}>{l}</button>
              ))}
            </div>
          </div>
          {loading ? <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Đang tải…</div>
            : shown.length === 0 ? <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Không có dữ liệu trong kỳ.</div>
              : chartType === 'bar' ? <GroupedBars rows={shown} /> : <LineChart rows={shown} />}
        </div>

        {/* Bảng chi tiết */}
        <div style={{ background: '#fff', borderRadius: 24, padding: '28px 32px', boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>Chi tiết hiệu suất nhân viên</div>
            <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 999 }}>{shown.length} nhân viên</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 250 }}>Bác sĩ</th>
                  <th style={th}>Chuyên khoa</th>
                  <th style={th}>BN đã khám</th>
                  <th style={th}>TG khám TB</th>
                  <th style={th}>Số đơn thuốc</th>
                  <th style={{ ...th, width: 180 }}>Tỉ lệ đúng giờ</th>
                  <th style={{ ...th, textAlign: 'right' }}>Xu hướng</th>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 ? <tr><td colSpan={7} style={{ padding: 24, color: '#94a3b8', textAlign: 'center' }}>Không có dữ liệu.</td></tr>
                  : shown.map((r, i) => {
                    const ot = r.onTimeRate != null ? Math.round(r.onTimeRate * 100) : null
                    const otc = ot != null ? onTimeColor(ot) : '#cbd5e1'
                    const tr = trend(r)
                    const av = AVATAR[i % AVATAR.length]
                    return (
                      <tr key={r.doctorId}>
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${av}22`, color: av, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{initials(r.doctorName) || 'BS'}</div>
                            <span style={{ fontWeight: 700, color: '#334155', fontSize: 15 }}>BS. {r.doctorName}</span>
                          </div>
                        </td>
                        <td style={{ ...td, color: '#64748b', fontSize: 14 }}>{r.role || '—'}</td>
                        <td style={{ ...td, fontWeight: 700, color: '#1e293b' }}>{r.patientsSeen}</td>
                        <td style={{ ...td, color: '#64748b', fontSize: 14 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FiClock color="#94a3b8" /> {r.avgConsultationMinutes != null ? `${r.avgConsultationMinutes} phút` : '—'}</span></td>
                        <td style={{ ...td, color: '#64748b', fontSize: 14 }}>{r.prescriptionVolume}</td>
                        <td style={td}>
                          {ot == null ? <span style={{ color: '#94a3b8' }}>—</span> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <span style={{ color: otc, fontWeight: 700, fontSize: 14 }}>{ot}%</span>
                              <div style={{ width: 100, height: 6, background: '#f1f5f9', borderRadius: 999 }}>
                                <div style={{ width: `${ot}%`, height: '100%', background: otc, borderRadius: 999 }} />
                              </div>
                              {/* Ca thiếu check-in bị tính là trễ — nói rõ để không quy kết
                                  nhầm cho bác sĩ khi thực ra là lỗi quy trình tiếp đón. */}
                              {r.appointmentsWithoutCheckIn > 0 && (
                                <span style={{ color: '#b45309', fontSize: 11 }}
                                  title="Ca đã hoàn thành nhưng không có mốc check-in nên không chứng minh được đúng giờ">
                                  {r.appointmentsWithoutCheckIn} ca thiếu check-in
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ ...td, textAlign: 'right' }}>
                          {tr == null ? <span style={{ color: '#cbd5e1' }}>—</span>
                            : <span style={{ color: tr >= 0 ? '#10b981' : '#ef4444', fontWeight: 600, fontSize: 14 }}>{tr >= 0 ? `+${tr}` : tr}%</span>}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
            <p style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.6 }}>
              * <b>TG khám TB</b> = trung bình (thời điểm khóa hồ sơ bệnh án − thời điểm mở bệnh án) của các ca đã hoàn tất.
              <b> Tỉ lệ đúng giờ</b> = tỉ lệ lịch hẹn có giờ check-in không trễ hơn giờ hẹn. <b>Xu hướng</b> = thay đổi số BN đã khám so với kỳ trước.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
