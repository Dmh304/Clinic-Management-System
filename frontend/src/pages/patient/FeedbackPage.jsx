// UC-48: Bệnh nhân gửi đánh giá cho các buổi khám đã hoàn thành.
import { useEffect, useState } from 'react'
import { appointmentService } from '../../services/appointmentService'
import { feedbackService } from '../../services/feedbackService'

const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 12 }

function StarPicker({ value, onChange }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} onClick={() => onChange(s)}
          style={{ cursor: 'pointer', fontSize: 24, color: s <= value ? '#f59e0b' : '#cbd5e1' }}>★</span>
      ))}
    </span>
  )
}

export default function FeedbackPage() {
  const [appointments, setAppointments] = useState([])
  const [doneIds, setDoneIds] = useState(new Set())
  const [drafts, setDrafts] = useState({}) // apptId -> { rating, content }
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const [apptRes, fbRes] = await Promise.all([
        appointmentService.getMyAppointments(),
        feedbackService.getMy(),
      ])
      setAppointments((apptRes.data || []).filter((a) => a.status === 'COMPLETED'))
      setDoneIds(new Set((fbRes.data || []).map((f) => f.appointmentId)))
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được dữ liệu')
    }
  }
  useEffect(() => { load() }, [])

  const setDraft = (id, field, value) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [field]: value } }))

  const submit = async (apptId) => {
    const draft = drafts[apptId] || {}
    if (!draft.rating) { setError('Vui lòng chọn số sao'); return }
    setError(''); setMsg('')
    try {
      await feedbackService.submit({
        appointmentId: apptId,
        rating: draft.rating,
        content: draft.content || null,
        isAnonymous: false,
      })
      setMsg('Cảm ơn bạn đã gửi đánh giá!')
      setDoneIds((s) => new Set([...s, apptId]))
    } catch (e) {
      setError(e?.response?.data?.message || 'Gửi đánh giá thất bại')
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h2>Đánh giá buổi khám</h2>
      {msg && <div style={{ color: '#059669', marginBottom: 12 }}>{msg}</div>}
      {error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{error}</div>}

      {appointments.length === 0 && <p style={{ color: '#64748b' }}>Bạn chưa có buổi khám hoàn thành nào.</p>}

      {appointments.map((a) => {
        const done = doneIds.has(a.id)
        const draft = drafts[a.id] || {}
        return (
          <div key={a.id} style={card}>
            <div style={{ fontWeight: 600 }}>
              {a.doctorName ? `BS. ${a.doctorName}` : 'Buổi khám'} · {a.appointmentTime ? new Date(a.appointmentTime).toLocaleString('vi-VN') : ''}
            </div>
            {done ? (
              <div style={{ color: '#059669', marginTop: 8 }}>✓ Đã đánh giá</div>
            ) : (
              <div style={{ marginTop: 8 }}>
                <StarPicker value={draft.rating || 0} onChange={(v) => setDraft(a.id, 'rating', v)} />
                <br />
                <textarea placeholder="Nhận xét (không bắt buộc)" value={draft.content || ''}
                  onChange={(e) => setDraft(a.id, 'content', e.target.value)}
                  style={{ width: '100%', minHeight: 60, marginTop: 8 }} />
                <button onClick={() => submit(a.id)} style={{ padding: '6px 16px', marginTop: 6 }}>Gửi đánh giá</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
