/**
 * @author  ThangNB - HE201024
 * @created 2026-07-19
 * @updated 2026-07-20
 *
 * Aggregated patient feedback report for the Clinic Manager
 * (UC-53 Generate Feedback Report): average star rating per doctor and per
 * nurse, the per-participant scores broken down by role and by person, total
 * responses and response rate, with a CSV export.
 *
 * The two kinds of average are shown in separate tables on purpose: the doctor
 * and nurse tables average the visit's overall rating, while the role and
 * per-person tables average the stars the patient gave each individual (UC-48)
 * — that is the only score a receptionist or lab technician ever receives.
 *
 * The response rate is meaningful because BR-21 caps feedback at one per
 * visit, so the ratio cannot exceed 100%.
 * Anonymous submissions arrive with no patient name — that is withheld by the
 * backend, not merely hidden here.
 */
import { useEffect, useState } from 'react'
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa'
import { FiRefreshCw, FiDownload, FiMessageSquare, FiCheckCircle, FiPercent, FiSearch, FiCalendar } from 'react-icons/fi'
import { reportService, downloadBlob } from '../../services/reportService'

const C = { primary: '#7c3aed', secondary: '#00687a', success: '#059669', star: '#f59e0b', ink: '#121c2a', muted: '#4a4455', border: '#e5e7eb' }
const card = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }
const pct = (v) => (v == null ? '—' : (Number(v) * 100).toFixed(1) + '%')
const initials = (name) => (name || '').replace(/^(BS|ĐD|KTV)\.?\s*/i, '').split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase()
const firstOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` }
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/** Renders a 1..5 star rating, supporting half stars. */
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

/** Participant roles a patient can score (UC-48), in the order they appear in a visit. */
const ROLE_LABEL = { DOCTOR: 'Bác sĩ', NURSE: 'Điều dưỡng', RECEPTIONIST: 'Lễ tân', LAB_TECHNICIAN: 'KTV xét nghiệm', OTHER: 'Khác' }

/**
 * Renders one "average rating per person" table.
 *
 * Shared by the doctor, nurse and per-participant breakdowns so all three read
 * the same way — the only differences are the label field and whether a role
 * column is shown.
 *
 * @param {Object}   props
 * @param {string}   props.title      heading above the table
 * @param {string}   props.subtitle   optional explanation of what is averaged
 * @param {Array}    props.rows       aggregated rows from the report API
 * @param {string}   props.nameKey    field holding the person's name
 * @param {boolean}  props.withRole   show the participant role column
 * @param {string}   props.countLabel header for the response-count column
 * @param {JSX.Element} props.right   optional control rendered in the header
 * @returns {JSX.Element} the table card
 */
function RatingTable({ title, subtitle, rows, nameKey, withRole, countLabel = 'Số phản hồi', right }) {
  const cols = withRole ? 5 : 4
  return (
    <div style={{ ...card, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: '#fafbff', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{subtitle}</div>}
        </div>
        {right}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafbff' }}>
              <th style={th}>Nhân sự</th>
              {withRole && <th style={th}>Vai trò</th>}
              <th style={{ ...th, textAlign: 'center' }}>{countLabel}</th>
              <th style={th}>Đánh giá</th>
              <th style={{ ...th, width: '30%' }}>Mức độ hài lòng</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td style={{ ...td, color: C.muted }} colSpan={cols}>Không có dữ liệu trong kỳ này.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i}>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f3e8ff', color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{initials(r[nameKey]) || 'NS'}</div>
                    <span style={{ fontWeight: 600 }}>{r[nameKey]}</span>
                  </div>
                </td>
                {withRole && <td style={{ ...td, color: C.muted }}>{ROLE_LABEL[r.role] || r.role}</td>}
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
  )
}

/**
 * Renders the feedback report and its export action.
 * @returns {JSX.Element} the report screen
 */
export default function FeedbackReportPage() {
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(today())
  const [data, setData] = useState(null)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /** Ô chọn ngày trong hộp kỳ báo cáo — giữ giống hệt PatientStatisticsPage. */
  // Giữ khoảng ngày luôn hợp lệ: đổi một đầu mà làm khoảng bị ngược thì kéo đầu kia
  // theo. min/max trên input chỉ chặn bộ chọn — người dùng vẫn gõ tay được, và khoảng
  // ngược khiến mọi truy vấn BETWEEN khớp 0 dòng nên báo cáo hiện toàn số 0 mà không
  // báo lỗi gì.
  // Chỉ chỉnh khi ngày đã "ra hình": gõ năm 2026 đi qua 0002 → 0020 → 0202, chỉnh ngay
  // từng nhịp thì đầu ngày còn lại bị kéo về năm 0002.
  const SANE_FROM = '2000-01-01'
  const capToday = (v) => (v && v > today() ? today() : v)
  const onFromChange = (raw) => {
    if (!raw || raw < SANE_FROM) { setFrom(raw); return }
    const v = capToday(raw)
    setFrom(v)
    if (to && v > to) setTo(v)
  }
  const onToChange = (raw) => {
    if (!raw || raw < SANE_FROM) { setTo(raw); return }
    const v = capToday(raw)
    setTo(v)
    if (from && v < from) setFrom(v)
  }

  // Bọc bằng <label> + gọi showPicker(): bấm vào nhãn hay icon lịch là mở bộ chọn ngày.
  // Mặc định input type="date" chỉ mở khi bấm đúng icon nhỏ của trình duyệt, mà icon đó
  // gần như vô hình vì input để nền trong suốt. Bấm thẳng vào con số vẫn đặt được con
  // trỏ để gõ tay — nên giữ nguyên cả hai cách nhập.
  const dateBox = (label, value, onChange, limits = {}) => (
    <label
      style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
      onClick={(e) => { if (e.target.tagName !== 'INPUT') e.currentTarget.querySelector('input')?.showPicker?.() }}>
      <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: C.muted }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <FiCalendar size={14} color={C.primary} />
        <input type="date" value={value} min={limits.min} max={limits.max} onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onChange(e.target.value)}
          style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', fontWeight: 700, color: C.ink, fontSize: 13 }} />
      </span>
    </label>
  )

  /** Loads the aggregated feedback for the selected period (UC-53 steps 3-4). */
  const load = async () => {
    setLoading(true); setError('')
    try { const res = await reportService.feedbackReport(from, to); setData(res.data || {}) }
    catch (e) { setError(e?.response?.data?.message || 'Không tải được báo cáo') } finally { setLoading(false) }
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // One search box filters every breakdown, so looking up a name does not depend
  // on guessing which table that person belongs to.
  const match = (name) => !q || (name || '').toLowerCase().includes(q.toLowerCase())
  const byDoctor = (data?.byDoctor || []).filter((r) => match(r.doctorName))
  const byNurse = (data?.byNurse || []).filter((r) => match(r.nurseName))
  const byStaff = (data?.byStaff || []).filter((r) => match(r.staffName))
  const byRole = data?.byRole || []

  return (
    <div style={{ color: C.ink }}>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Báo cáo đánh giá</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Mức độ hài lòng của bệnh nhân theo kỳ & theo bác sĩ</p>
          </div>
          {/* Thanh chọn kỳ + hành động: giữ y hệt trang Thống kê bệnh nhân — hai trang này
              là cặp báo cáo cùng cấp, lệch kiểu nút khiến người dùng tưởng hai chỗ khác
              chức năng. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#eff4ff', border: `1px solid ${C.border}`, borderRadius: 12, padding: '8px 16px' }}>
              {dateBox('Từ ngày', from, onFromChange, { max: to || today() })}
              <div style={{ width: 1, height: 32, background: C.border }} />
              {dateBox('Đến ngày', to, onToChange, { min: from, max: today() })}
            </div>
            <button onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.primary, color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>
              <FiRefreshCw size={16} /> {loading ? 'Đang tải…' : 'Tải lại'}
            </button>
            <button onClick={async () => { const blob = await reportService.exportFeedback(from, to); downloadBlob(blob, 'bao-cao-danh-gia.xlsx') }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.success, color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>
              <FiDownload size={16} /> Xuất Excel
            </button>
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
              <StatCard label="Buổi có thể đánh giá" value={data.rateableVisits ?? data.completedAppointments ?? 0} sub={`${data.completedAppointments ?? 0} buổi khám · ${data.completedCareSessions ?? 0} buổi dịch vụ`} Icon={FiCheckCircle} iconBg="#cffafe" iconColor={C.secondary} />
              <StatCard label="Tỉ lệ phản hồi" value={pct(data.responseRate)} sub="phản hồi / buổi đã hoàn thành" Icon={FiPercent} iconBg="#dcfce7" iconColor={C.success} />
            </div>

            {/* Điểm trung bình theo vai trò (bệnh nhân chấm riêng từng người) */}
            {byRole.length > 0 && (
              <div style={{ ...card, padding: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Điểm theo vai trò</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Trung bình số sao bệnh nhân chấm riêng cho từng vị trí tham gia buổi khám/buổi dịch vụ</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {byRole.map((r) => (
                    <div key={r.role} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', minWidth: 190 }}>
                      <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{ROLE_LABEL[r.role] || r.role}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <span style={{ fontSize: 22, fontWeight: 800 }}>{Number(r.averageRating).toFixed(2)}</span>
                        <Stars v={r.averageRating} />
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{r.responses} lượt chấm</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bảng theo bác sĩ */}
            <RatingTable
              title="Điểm trung bình theo bác sĩ"
              subtitle="Điểm tổng thể của buổi khám, tính cho bác sĩ phụ trách"
              rows={byDoctor}
              nameKey="doctorName"
              right={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', width: 260 }}>
                  <FiSearch color="#94a3b8" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm nhân sự…" style={{ border: 'none', outline: 'none', flex: 1, fontSize: 14 }} />
                </div>
              }
            />

            {/* Bảng theo điều dưỡng */}
            <RatingTable
              title="Điểm trung bình theo điều dưỡng"
              subtitle="Điểm tổng thể của buổi dịch vụ, tính cho điều dưỡng phụ trách"
              rows={byNurse}
              nameKey="nurseName"
            />

            {/* Bảng theo từng nhân sự tham gia (gồm cả lễ tân và KTV xét nghiệm) */}
            <RatingTable
              title="Điểm theo từng nhân sự"
              subtitle="Số sao bệnh nhân chấm riêng cho từng người tham gia — thấp nhất xếp trước"
              rows={byStaff}
              nameKey="staffName"
              withRole
              countLabel="Lượt chấm"
            />
          </>
        )}
      </div>
    </div>
  )
}
