// UC-48: Bệnh nhân đánh giá buổi khám đã hoàn thành — gồm cả lịch khám BÁC SĨ
// (Appointment) và buổi dịch vụ do ĐIỀU DƯỠNG đảm nhiệm (CareSession).
// Luồng 2 bước: (1) chọn buổi khám/buổi dịch vụ → (2) form đánh giá gồm ĐÁNH GIÁ TỔNG THỂ
// và ĐÁNH GIÁ TỪNG NGƯỜI THAM GIA (bác sĩ/điều dưỡng, lễ tân, KTV xét nghiệm).
import { useEffect, useState } from 'react'
import { FiUser, FiCalendar, FiClock, FiCheckCircle, FiFlag } from 'react-icons/fi'
import { FaStar, FaRegStar, FaStethoscope, FaFlask, FaConciergeBell, FaUserNurse } from 'react-icons/fa'
import { appointmentService } from '../../services/appointmentService'
import { careSessionService } from '../../services/careSessionService'
import { feedbackService } from '../../services/feedbackService'

const TEAL = '#0f6e66'
const MAX_LEN = 600

// Nền sáng cho cả trang (tránh nền tối của layout)
const PAGE = { background: '#f1f5f9', minHeight: '100vh', color: '#0f172a' }

const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '')

const ROLE_ICON = { DOCTOR: FaStethoscope, RECEPTIONIST: FaConciergeBell, LAB_TECHNICIAN: FaFlask, NURSE: FaUserNurse }

function Stars({ value, onChange, size = 40 }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 4 }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = s <= (hover || value)
        const Icon = filled ? FaStar : FaRegStar
        return (
          <Icon key={s} size={size} color={filled ? '#f4b400' : '#d8d2c4'} style={{ cursor: 'pointer' }}
            onClick={() => onChange(s)} onMouseEnter={() => setHover(s)} />
        )
      })}
    </div>
  )
}

function RoleIcon({ role, size = 16 }) {
  const Icon = ROLE_ICON[role] || FiUser
  return <Icon size={size} color="#0f6e66" />
}

export default function FeedbackPage() {
  const [visits, setVisits] = useState([]) // { type, id, title, subtitle, dateTime, serviceName, raw }
  const [doneApptIds, setDoneApptIds] = useState(new Set())
  const [doneCareSessionIds, setDoneCareSessionIds] = useState(new Set())
  const [loadingList, setLoadingList] = useState(true)

  const [selected, setSelected] = useState(null) // { type, id, ... }
  const [visit, setVisit] = useState(null)
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [partRatings, setPartRatings] = useState({}) // key idx -> rating
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const loadList = async () => {
    setLoadingList(true)
    try {
      const [apptRes, careRes, fbRes] = await Promise.all([
        appointmentService.getMyAppointments(),
        careSessionService.getMy(),
        feedbackService.getMy(),
      ])

      const appts = (apptRes.data || [])
        .filter((a) => a.status === 'COMPLETED')
        .map((a) => ({
          type: 'APPOINTMENT',
          id: a.id,
          title: a.doctorName ? `BS. ${a.doctorName}` : 'Bác sĩ',
          subtitleRole: 'DOCTOR',
          dateTime: a.appointmentTime,
          serviceName: a.serviceName,
          raw: a,
        }))

      const sessions = (careRes.data || [])
        .filter((s) => s.status === 'COMPLETED')
        .map((s) => ({
          type: 'CARE_SESSION',
          id: s.id,
          title: s.nurseName ? `ĐD. ${s.nurseName}` : 'Điều dưỡng',
          subtitleRole: 'NURSE',
          dateTime: s.scheduledDateTime,
          serviceName: s.serviceName,
          raw: s,
        }))

      const merged = [...appts, ...sessions].sort(
        (a, b) => new Date(b.dateTime) - new Date(a.dateTime)
      )
      setVisits(merged)

      const feedbacks = fbRes.data || []
      setDoneApptIds(new Set(feedbacks.filter((f) => f.appointmentId).map((f) => f.appointmentId)))
      setDoneCareSessionIds(new Set(feedbacks.filter((f) => f.careSessionId).map((f) => f.careSessionId)))
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được danh sách buổi khám')
    } finally { setLoadingList(false) }
  }
  useEffect(() => { loadList() }, [])

  const isDone = (v) => (v.type === 'APPOINTMENT' ? doneApptIds.has(v.id) : doneCareSessionIds.has(v.id))

  const openForm = async (v) => {
    setSelected(v); setVisit(null); setRating(0); setContent(''); setPartRatings({}); setError(''); setMsg('')
    if (v.type === 'APPOINTMENT') {
      try {
        const res = await feedbackService.getParticipants(v.id)
        setVisit(res.data || {})
      } catch (e) {
        setError(e?.response?.data?.message || 'Không tải được thông tin buổi khám')
      }
    } else {
      // Buổi dịch vụ: chỉ có 1 người tham gia — điều dưỡng đảm nhiệm (đã có sẵn trong raw)
      const s = v.raw
      setVisit({
        appointmentTime: s.scheduledDateTime,
        serviceName: s.serviceName,
        participants: s.nurseName
          ? [{ role: 'NURSE', roleLabel: 'Điều dưỡng', name: s.nurseName, detail: null }]
          : [],
      })
    }
  }

  const backToList = () => { setSelected(null); setVisit(null) }

  const submit = async () => {
    if (!rating) { setError('Vui lòng chọn số sao đánh giá tổng thể'); return }
    const participants = visit?.participants || []
    const participantRatings = participants
      .map((p, i) => ({ role: p.role, name: p.name, rating: partRatings[i] }))
      .filter((x) => x.rating)
    setSubmitting(true); setError('')
    try {
      const payload = {
        rating, content: content || null, isAnonymous: false, participantRatings,
        ...(selected.type === 'APPOINTMENT' ? { appointmentId: selected.id } : { careSessionId: selected.id }),
      }
      await feedbackService.submit(payload)
      setMsg('Cảm ơn bạn đã gửi đánh giá!')
      if (selected.type === 'APPOINTMENT') setDoneApptIds((s) => new Set([...s, selected.id]))
      else setDoneCareSessionIds((s) => new Set([...s, selected.id]))
      await loadList()
      backToList()
    } catch (e) {
      setError(e?.response?.data?.message || 'Gửi đánh giá thất bại')
    } finally { setSubmitting(false) }
  }

  // ─────────────────── BƯỚC 2: form đánh giá ───────────────────
  if (selected) {
    const isAppt = selected.type === 'APPOINTMENT'
    const headerName = isAppt
      ? (visit?.doctorName || selected.raw.doctorName)
      : selected.raw.nurseName
    const headerLabel = isAppt ? (headerName ? `BS. ${headerName}` : 'Bác sĩ') : (headerName ? `ĐD. ${headerName}` : 'Điều dưỡng')
    const specialty = isAppt ? visit?.doctorSpecialty : null
    const participants = visit?.participants || []
    return (
      <div style={PAGE}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
            {/* Header teal */}
            <div style={{ background: TEAL, color: '#fff', padding: '22px 28px' }}>
              <div style={{ fontSize: 12, letterSpacing: 2, opacity: 0.85, marginBottom: 10 }}>ECMS — CỔNG BỆNH NHÂN</div>
              <div style={{ fontSize: 30, fontWeight: 700, fontFamily: 'Georgia, serif' }}>
                {isAppt ? 'Buổi khám của bạn thế nào?' : 'Buổi dịch vụ của bạn thế nào?'}
              </div>
              <div style={{ opacity: 0.9, marginTop: 6 }}>Đánh giá của bạn giúp chúng tôi cải thiện chất lượng chăm sóc.</div>
            </div>

            {/* Thông tin buổi khám */}
            <div style={{ background: '#eaf3f1', padding: '16px 28px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ color: TEAL, fontWeight: 700, fontSize: 16 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <RoleIcon role={isAppt ? 'DOCTOR' : 'NURSE'} size={18} /> {headerLabel}{specialty ? ` · ${specialty}` : ''}
                </span>
              </div>
              <div style={{ color: '#475569', fontSize: 13, marginTop: 6 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FiCalendar /> {fmtDate(visit?.appointmentTime || selected.dateTime)}</span> &nbsp;&nbsp; <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FiClock /> {fmtTime(visit?.appointmentTime || selected.dateTime)}</span>
              </div>
              {visit?.serviceName && <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{visit.serviceName}</div>}
            </div>

            <div style={{ padding: '20px 28px' }}>
              {/* Đánh giá tổng thể */}
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Đánh giá tổng thể <span style={{ color: '#ef4444' }}>*</span></div>
              <Stars value={rating} onChange={setRating} />

              {/* Đánh giá từng người tham gia */}
              <div style={{ fontWeight: 600, margin: '20px 0 4px' }}>Đánh giá từng người tham gia <span style={{ color: '#94a3b8', fontWeight: 400 }}>(không bắt buộc)</span></div>
              {participants.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>{visit ? 'Không có dữ liệu người tham gia.' : 'Đang tải…'}</div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  {participants.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 14 }}>
                        <span style={{ marginRight: 6, display: 'inline-flex', verticalAlign: 'middle' }}><RoleIcon role={p.role} /></span>
                        <b>{p.roleLabel}:</b> {p.name}{p.detail ? ` (${p.detail})` : ''}
                      </div>
                      <Stars size={22} value={partRatings[i] || 0} onChange={(v) => setPartRatings((r) => ({ ...r, [i]: v }))} />
                    </div>
                  ))}
                </div>
              )}

              {/* Nhận xét */}
              <div style={{ fontWeight: 600, margin: '18px 0 8px' }}>Nhận xét <span style={{ color: '#94a3b8', fontWeight: 400 }}>(không bắt buộc)</span></div>
              <textarea value={content} maxLength={MAX_LEN} onChange={(e) => setContent(e.target.value)}
                placeholder="Chia sẻ trải nghiệm của bạn về bác sĩ, nhân viên hoặc phòng khám…"
                style={{ width: '100%', minHeight: 110, padding: 12, border: '1px solid #cbd5e1', borderRadius: 8, resize: 'vertical', background: '#f8fafc', boxSizing: 'border-box', color: '#0f172a' }} />
              <div style={{ textAlign: 'right', color: '#94a3b8', fontSize: 12 }}>{content.length}/{MAX_LEN}</div>

              <div style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>
                Đánh giá của bạn sẽ được Quản lý phòng khám xem xét trước khi xử lý. Nội dung không được chia sẻ công khai nếu không có sự đồng ý của bạn.
              </div>

              {error && <div style={{ color: '#dc2626', marginTop: 12 }}>{error}</div>}
              {msg && <div style={{ color: '#059669', marginTop: 12 }}>{msg}</div>}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                <button onClick={backToList} style={{ background: 'none', border: 'none', textDecoration: 'underline', color: '#334155', cursor: 'pointer', fontSize: 14 }}>Bỏ qua</button>
                <button onClick={submit} disabled={submitting}
                  style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 999, padding: '12px 28px', fontWeight: 600, cursor: 'pointer' }}>
                  {submitting ? 'Đang gửi…' : 'Gửi đánh giá'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────── BƯỚC 1: chọn buổi khám / buổi dịch vụ ───────────────────
  return (
    <div style={PAGE}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
        <h2 style={{ color: '#0f172a', marginBottom: 4 }}>Đánh giá buổi khám</h2>
        <p style={{ color: '#64748b', marginTop: 0 }}>Chọn một buổi khám hoặc buổi dịch vụ đã hoàn thành để gửi đánh giá.</p>
        {msg && <div style={{ color: '#059669', marginBottom: 12 }}>{msg}</div>}
        {error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{error}</div>}

        {loadingList ? <p style={{ color: '#64748b' }}>Đang tải…</p>
          : visits.length === 0 ? <p style={{ color: '#64748b' }}>Bạn chưa có buổi khám hoặc buổi dịch vụ hoàn thành nào.</p>
            : visits.map((v) => {
              const done = isDone(v)
              const iconBg = v.type === 'APPOINTMENT' ? '#e0edff' : '#e3f5ee'
              const iconColor = v.type === 'APPOINTMENT' ? '#2563eb' : '#0f6e66'
              const Icon = v.type === 'APPOINTMENT' ? FaStethoscope : FaUserNurse
              return (
                <div key={`${v.type}-${v.id}`} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} color={iconColor} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{v.title}</div>
                      <div style={{ color: '#64748b', fontSize: 13, marginTop: 2, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FiCalendar size={12} /> {fmtDate(v.dateTime)}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FiClock size={12} /> {fmtTime(v.dateTime)}</span>
                      </div>
                      {v.serviceName && <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{v.serviceName}</div>}
                    </div>
                  </div>
                  {done
                    ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#059669', fontWeight: 600, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 999, padding: '6px 14px', fontSize: 13, whiteSpace: 'nowrap' }}>
                        <FiCheckCircle /> Đã đánh giá
                      </span>
                    )
                    : (
                      <button onClick={() => openForm(v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: TEAL, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <FiFlag /> Gửi đánh giá
                      </button>
                    )}
                </div>
              )
            })}
      </div>
    </div>
  )
}
