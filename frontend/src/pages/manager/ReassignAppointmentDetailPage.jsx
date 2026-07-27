import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { appointmentService } from '../../services/appointmentService'
import { doctorService } from '../../services/doctorService'
import { pageTitle } from './managerTypography'

// Cùng bảng màu/nhãn trạng thái đang dùng ở dashboard lễ tân, để đồng bộ hình ảnh
// giữa trang danh sách và trang chi tiết chuyển lịch.
const STATUS_INFO = {
  PENDING: { label: 'Chờ xác nhận', color: '#d97706', bg: '#fef3c7' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#2563eb', bg: '#dbeafe' },
  WAITING: { label: 'Chờ khám', color: '#7c3aed', bg: '#ede9fe' },
  IN_PROGRESS: { label: 'Đang khám', color: '#ea580c', bg: '#ffedd5' },
  COMPLETED: { label: 'Hoàn thành', color: '#16a34a', bg: '#dcfce7' },
  CANCELLED: { label: 'Đã huỷ', color: '#dc2626', bg: '#fee2e2' },
}

// Trùng với MAX_APPOINTMENTS_PER_DOCTOR_PER_DAY ở AppointmentServiceImpl (BR-03) —
// dùng để hiện công suất bác sĩ và chặn chọn bác sĩ đã đầy lịch ngay trên UI.
const MAX_APPOINTMENTS_PER_DOCTOR_PER_DAY = 30
// Các trạng thái được tính vào công suất trong ngày — khớp validateDoctorCapacity() backend.
const CAPACITY_STATUSES = ['CONFIRMED', 'WAITING', 'IN_PROGRESS']

const CANNOT_REASSIGN_STATUSES = ['COMPLETED', 'CANCELLED']

function toLocalISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function stripDiacritics(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

function formatDateTime(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
}

const DoctorAvatarPlaceholder = () => (
  <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }}>
    <rect width="100" height="100" fill="#e0e7ff" />
    <circle cx="50" cy="40" r="17" fill="#a5b4fc" />
    <path d="M50 62c-19 0-34 12.5-34 28v10h68V90c0-15.5-15-28-34-28z" fill="#a5b4fc" />
  </svg>
)

const DoctorAvatar = ({ doctor, size = 44 }) => (
  <div style={{ width: size, height: size, borderRadius: 12, flexShrink: 0, overflow: 'hidden', background: '#e0e7ff' }}>
    {doctor.avatarUrl
      ? <img src={doctor.avatarUrl} alt={doctor.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      : <DoctorAvatarPlaceholder />}
  </div>
)

export default function ReassignAppointmentDetailPage() {
  const { appointmentId } = useParams()
  const navigate = useNavigate()

  const [appt, setAppt] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [doctorSearch, setDoctorSearch] = useState('')
  const [selectedDoctorId, setSelectedDoctorId] = useState(null)
  const [date, setDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [reason, setReason] = useState('')

  const [daySchedule, setDaySchedule] = useState([])
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Tải lịch hẹn cần chuyển + danh sách bác sĩ
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setLoadError('')
    Promise.all([
      appointmentService.getById(appointmentId),
      doctorService.getAllDoctors(),
    ]).then(([apptRes, docRes]) => {
      const a = apptRes.data
      setAppt(a)
      setDoctors(docRes.data || [])
      setSelectedDoctorId(a.doctorId || null)
      setDate(a.appointmentTime ? toLocalISODate(new Date(a.appointmentTime)) : toLocalISODate(new Date()))
    }).catch(() => {
      setLoadError('Không tải được thông tin lịch hẹn')
    }).finally(() => setLoading(false))
  }, [appointmentId])

  // Tải lịch làm việc trong ngày (mọi bác sĩ) để tính công suất từng bác sĩ
  useEffect(() => {
    if (!date) return
    appointmentService.getDailySchedule(date)
      .then(res => setDaySchedule(res.data || []))
      .catch(() => setDaySchedule([]))
  }, [date])

  // Tải khung giờ trống thực tế của bác sĩ đang chọn cho ngày đang chọn
  useEffect(() => {
    if (!selectedDoctorId || !date) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlots([])
      return
    }
    setLoadingSlots(true)
    setSelectedTime('')
    appointmentService.getAvailableSlots(selectedDoctorId, date)
      .then(res => setSlots(res.data || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [selectedDoctorId, date])

  // Công suất hôm nay (đang xem) của từng bác sĩ — đếm các lịch hẹn đang hoạt động,
  // loại trừ chính lịch hẹn đang được chuyển để không tự tính vào công suất của nó.
  const capacityByDoctor = useMemo(() => {
    const map = new Map()
    for (const a of daySchedule) {
      if (!a.doctorId || String(a.id) === String(appointmentId)) continue
      if (!CAPACITY_STATUSES.includes(a.status)) continue
      map.set(a.doctorId, (map.get(a.doctorId) || 0) + 1)
    }
    return map
  }, [daySchedule, appointmentId])

  const filteredDoctors = useMemo(() => {
    const q = stripDiacritics(doctorSearch.trim())
    if (!q) return doctors
    return doctors.filter(d => stripDiacritics(d.fullName).includes(q))
  }, [doctors, doctorSearch])

  const recipients = useMemo(() => {
    if (!appt) return []
    const list = [appt.patientName]
    const doctorChanged = selectedDoctorId && appt.doctorId && selectedDoctorId !== appt.doctorId
    const timeChanged = selectedTime && `${date}T${selectedTime}:00` !== appt.appointmentTime?.slice(0, 16) + ':00'
    if (doctorChanged) {
      if (appt.doctorName) list.push(appt.doctorName)
      const newDoctor = doctors.find(d => d.id === selectedDoctorId)
      if (newDoctor) list.push(newDoctor.fullName)
    } else if (timeChanged && appt.doctorName) {
      list.push(appt.doctorName)
    }
    return list
  }, [appt, selectedDoctorId, selectedTime, date, doctors])

  const handleSubmit = async () => {
    setError('')
    if (!selectedTime) return setError('Vui lòng chọn khung giờ mới')
    if (!reason.trim()) return setError('Vui lòng nhập lý do chuyển lịch')
    setSaving(true)
    try {
      await appointmentService.reassignAppointment(appointmentId, {
        doctorId: selectedDoctorId,
        newAppointmentTime: `${date}T${selectedTime}:00`,
        reason: reason.trim(),
      })
      alert('Chuyển lịch hẹn thành công!')
      navigate('/manager/reassign-appointment')
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi chuyển lịch')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>
  if (loadError || !appt) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#dc2626', marginBottom: 16 }}>{loadError || 'Không tìm thấy lịch hẹn'}</p>
        <button onClick={() => navigate('/manager/reassign-appointment')}
          style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          ← Quay lại danh sách
        </button>
      </div>
    )
  }

  const statusInfo = STATUS_INFO[appt.status] || { label: appt.status, color: '#6b7280', bg: '#f3f4f6' }
  const cannotReassign = CANNOT_REASSIGN_STATUSES.includes(appt.status)

  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>
          <span style={{ cursor: 'pointer', color: '#2563eb' }} onClick={() => navigate('/manager/reassign-appointment')}>Quản lý lịch hẹn</span>
          {' › '}Chuyển lịch
        </div>
        <h1 style={{ ...pageTitle, marginBottom: 20 }}>Chuyển lịch hẹn</h1>

        {/* Thẻ thông tin bệnh nhân + lịch hẹn hiện tại */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '18px 22px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#94a3b8' }}>
              👤
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#1e293b' }}>{appt.patientName}</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Mã bệnh nhân: {appt.patientCode || `#${appt.patientId}`}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Bác sĩ hiện tại</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{appt.doctorName || 'Chưa phân công'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Lịch hẹn hiện tại</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{formatDateTime(appt.appointmentTime)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Trạng thái</div>
              <span style={{ background: statusInfo.bg, color: statusInfo.color, padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>{statusInfo.label}</span>
            </div>
          </div>
        </div>

        {cannotReassign ? (
          <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 12, padding: 20, fontSize: 14 }}>
            Không thể chuyển lịch hẹn đã {appt.status === 'COMPLETED' ? 'hoàn thành' : 'huỷ'}.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 20, marginBottom: 20 }}>
              {/* Chọn bác sĩ mới */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>👥 Chọn Bác sĩ mới</h2>
                  <input
                    type="text"
                    placeholder="Tìm tên bác sĩ..."
                    value={doctorSearch}
                    onChange={e => setDoctorSearch(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', width: 180 }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, maxHeight: 420, overflowY: 'auto' }}>
                  {filteredDoctors.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 20 }}>Không tìm thấy bác sĩ</div>
                  )}
                  {filteredDoctors.map(d => {
                    const active = selectedDoctorId === d.id
                    const count = capacityByDoctor.get(d.id) || 0
                    const full = count >= MAX_APPOINTMENTS_PER_DOCTOR_PER_DAY && d.id !== appt.doctorId
                    return (
                      <button
                        key={d.id}
                        disabled={full}
                        onClick={() => setSelectedDoctorId(d.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                          border: `2px solid ${active ? '#2563eb' : '#e2e8f0'}`,
                          background: full ? '#f8fafc' : '#fff',
                          borderRadius: 12, padding: 10, cursor: full ? 'not-allowed' : 'pointer',
                          opacity: full ? 0.6 : 1, position: 'relative',
                        }}
                      >
                        {active && (
                          <span style={{ position: 'absolute', top: 6, right: 8, width: 18, height: 18, borderRadius: '50%', background: '#2563eb', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                        )}
                        <DoctorAvatar doctor={d} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.fullName}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{d.specialization || 'Bác sĩ'}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: full ? '#dc2626' : '#64748b' }}>
                            Công suất ngày này: {count}/{MAX_APPOINTMENTS_PER_DOCTOR_PER_DAY} lịch{full ? ' (Đầy)' : ''}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Chọn giờ & ngày mới */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>🕐 Chọn Giờ & Ngày mới</h2>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>NGÀY KHÁM</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }} />

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>KHUNG GIỜ TRỐNG (07:30 - 17:00)</label>
                {!selectedDoctorId ? (
                  <div style={{ fontSize: 13, color: '#94a3b8', padding: '12px 0' }}>Vui lòng chọn bác sĩ trước</div>
                ) : loadingSlots ? (
                  <div style={{ fontSize: 13, color: '#94a3b8', padding: '12px 0' }}>Đang tải khung giờ...</div>
                ) : slots.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#94a3b8', padding: '12px 0' }}>Phòng khám không có khung giờ khám vào ngày này</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                    {slots.map(s => {
                      const active = selectedTime === s.time
                      return (
                        <button
                          key={s.time}
                          disabled={!s.available}
                          onClick={() => setSelectedTime(s.time)}
                          style={{
                            padding: '8px 4px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: s.available ? 'pointer' : 'not-allowed',
                            border: `1px solid ${active ? '#2563eb' : '#e2e8f0'}`,
                            background: active ? '#2563eb' : s.available ? '#fff' : '#f8fafc',
                            color: active ? '#fff' : s.available ? '#374151' : '#cbd5e1',
                          }}
                        >
                          {s.time}{!s.available ? ' - Full' : ''}
                        </button>
                      )
                    })}
                  </div>
                )}

                <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#1e40af', display: 'flex', gap: 8 }}>
                  <span>●</span>
                  <span>Lịch hẹn này sẽ duy trì trạng thái <strong>{statusInfo.label}</strong> sau khi chuyển.</span>
                </div>
              </div>
            </div>

            {/* Lý do chuyển lịch */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Lý do chuyển lịch (Bắt buộc) *</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder="Nhập lý do chuyển lịch (vd: Bác sĩ cũ nghỉ đột xuất, yêu cầu bệnh nhân...)"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '6px 0 0' }}>Lý do sẽ được lưu vào lịch sử cuộc hẹn và gửi kèm thông báo.</p>
            </div>

            {error && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>
            )}

            {/* Thông báo tự động + hành động */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#374151', maxWidth: 500 }}>
                <span>🔔</span>
                <span>
                  <strong>Thông báo tự động</strong><br />
                  Email và Thông báo ứng dụng sẽ được gửi tới: {recipients.join(', ')}.
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => navigate('/manager/reassign-appointment')}
                  style={{ background: '#f1f5f9', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                  Huỷ bỏ
                </button>
                <button onClick={handleSubmit} disabled={saving}
                  style={{ background: saving ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Đang xử lý...' : 'Xác nhận chuyển lịch'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
