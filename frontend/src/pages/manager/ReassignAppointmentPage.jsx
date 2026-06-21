import { useEffect, useState } from 'react'
import axiosClient from '../../api/axiosClient'

const STATUS_ACTIVE = ['PENDING', 'CONFIRMED', 'WAITING']

export default function ReassignAppointmentPage() {
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ doctorId: '', newAppointmentTime: '', reason: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      axiosClient.get('/v1/appointments/daily-schedule', { params: { date } }),
      axiosClient.get('/v1/doctors'),
    ]).then(([apptRes, docRes]) => {
      setAppointments((apptRes.data.data || []).filter(a => STATUS_ACTIVE.includes(a.status)))
      setDoctors(docRes.data.data || [])
    }).finally(() => setLoading(false))
  }, [date])

  const openModal = (appt) => {
    setModal(appt)
    setForm({ doctorId: appt.doctorId || '', newAppointmentTime: '', reason: '' })
    setError('')
  }

  const handleReassign = async (e) => {
    e.preventDefault()
    if (!form.doctorId && !form.newAppointmentTime) return setError('Vui lòng chọn bác sĩ mới hoặc thời gian mới')
    setSaving(true)
    setError('')
    try {
      await axiosClient.patch(`/v1/appointments/${modal.id}/reassign`, {
        doctorId: form.doctorId ? Number(form.doctorId) : null,
        newAppointmentTime: form.newAppointmentTime || null,
        reason: form.reason,
      })
      alert('Chuyển lịch hẹn thành công!')
      setModal(null)
      // Refresh
      const res = await axiosClient.get('/v1/appointments/daily-schedule', { params: { date } })
      setAppointments((res.data.data || []).filter(a => STATUS_ACTIVE.includes(a.status)))
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi chuyển lịch')
    } finally {
      setSaving(false)
    }
  }

  const formatDT = (dt) => {
    if (!dt) return ''
    const d = new Date(dt)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate()}/${d.getMonth() + 1}`
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Chuyển lịch hẹn</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Đổi bác sĩ hoặc thời gian cho lịch hẹn</p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' }} />
        </div>

        {appointments.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <p style={{ color: '#64748b' }}>Không có lịch hẹn nào cần chuyển trong ngày này</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {appointments.map(a => (
              <div key={a.id} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{a.patientName}</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    {formatDT(a.appointmentTime)} • BS: {a.doctorName || 'Chưa phân công'} • {a.type === 'WALK_IN' ? 'Vãng lai' : 'Đặt trước'}
                  </div>
                </div>
                <button onClick={() => openModal(a)}
                  style={{ background: '#fef3c7', color: '#d97706', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  Chuyển lịch
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Chuyển lịch hẹn</h2>
            <p style={{ color: '#64748b', margin: '0 0 20px', fontSize: 14 }}>Bệnh nhân: {modal.patientName}</p>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <form onSubmit={handleReassign}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Bác sĩ mới</label>
                <select value={form.doctorId} onChange={e => setForm(f => ({ ...f, doctorId: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none' }}>
                  <option value="">-- Giữ nguyên bác sĩ --</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.fullName} — {d.specialization}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Thời gian mới</label>
                <input type="datetime-local" value={form.newAppointmentTime} onChange={e => setForm(f => ({ ...f, newAppointmentTime: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Lý do</label>
                <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2} placeholder="Bác sĩ vắng, phòng khám hỏng..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setModal(null)} style={{ flex: 1, background: '#f1f5f9', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Huỷ</button>
                <button type="submit" disabled={saving} style={{ flex: 2, background: saving ? '#fbbf24' : '#d97706', color: '#fff', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Đang xử lý...' : 'Xác nhận chuyển lịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
