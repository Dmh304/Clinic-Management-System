import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  FiChevronLeft, FiChevronRight, FiBookmark, FiCheck, FiCalendar,
  FiFileText, FiArrowRight, FiShield,
} from 'react-icons/fi'
import { subscriptionService } from '../../services/subscriptionService'
import { careSessionService } from '../../services/careSessionService'
import { CLINIC_HOURS, validateClinicTime, disabledClinicDate } from '../../constants/clinicInfo'

const TEAL = '#0f6e66'
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

// Danh sách khung giờ cố định trong giờ làm việc phòng khám, cách nhau 30 phút.
// Không mô phỏng trạng thái "hết chỗ" vì backend không có khái niệm giới hạn
// công suất theo khung giờ cho buổi dịch vụ (điều dưỡng được phân công sau khi đặt).
function buildDaySlots() {
  const slots = []
  let h = CLINIC_HOURS.openHour
  let m = CLINIC_HOURS.openMinute
  while (h < CLINIC_HOURS.closeHour || (h === CLINIC_HOURS.closeHour && m <= CLINIC_HOURS.closeMinute)) {
    slots.push({ h, m, label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` })
    m += 30
    if (m >= 60) { m -= 60; h += 1 }
  }
  return slots
}
const DAY_SLOTS = buildDaySlots()

function MiniCalendar({ month, onMonthChange, selectedDate, onSelectDate }) {
  const startOfMonth = month.startOf('month')
  const gridStart = startOfMonth.startOf('week')
  const cells = Array.from({ length: 42 }, (_, i) => gridStart.add(i, 'day'))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button type="button" onClick={() => onMonthChange(month.subtract(1, 'month'))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
          <FiChevronLeft size={18} />
        </button>
        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>Tháng {month.format('M, YYYY')}</div>
        <button type="button" onClick={() => onMonthChange(month.add(1, 'month'))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
          <FiChevronRight size={18} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, padding: '4px 0' }}>{w}</div>
        ))}
        {cells.map((d) => {
          const inMonth = d.month() === month.month()
          const disabled = disabledClinicDate(d, dayjs)
          const selected = selectedDate && d.isSame(selectedDate, 'day')
          return (
            <button
              type="button"
              key={d.format('YYYY-MM-DD')}
              disabled={disabled}
              onClick={() => onSelectDate(d)}
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none', margin: '2px auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                cursor: disabled ? 'not-allowed' : 'pointer',
                background: selected ? '#2563eb' : 'transparent',
                color: selected ? '#fff' : disabled ? '#cbd5e1' : inMonth ? '#1e293b' : '#cbd5e1',
                fontWeight: selected ? 700 : 400,
              }}
            >
              {d.date()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function BookCareSessionPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const preselectedId = searchParams.get('subscriptionId')
  const [subscriptions, setSubscriptions] = useState([])
  const [selectedSub, setSelectedSub] = useState(preselectedId || '')
  const [month, setMonth] = useState(dayjs())
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null) // { h, m, label }
  const [notes, setNotes] = useState('')
  const [confirmSafety, setConfirmSafety] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    subscriptionService.getMy().then(res => {
      const active = (res.data || []).filter(s => s.status === 'ACTIVE' && s.remainingSessions > 0)
      setSubscriptions(active)
    }).catch(() => setError('Không thể tải danh sách gói')).finally(() => setLoading(false))
  }, [])

  const scheduledDateTime = useMemo(() => {
    if (!selectedDate || !selectedSlot) return null
    return selectedDate.hour(selectedSlot.h).minute(selectedSlot.m).second(0)
  }, [selectedDate, selectedSlot])

  const isSlotDisabled = (slot) => {
    if (!selectedDate) return true
    const candidate = selectedDate.hour(slot.h).minute(slot.m).second(0)
    return candidate.isBefore(dayjs())
  }

  const handleSelectDate = (d) => {
    if (disabledClinicDate(d, dayjs)) return
    setSelectedDate(d)
    setSelectedSlot(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedSub) return setError('Vui lòng chọn gói dịch vụ')
    if (!scheduledDateTime) return setError('Vui lòng chọn ngày và khung giờ khám')
    const timeError = validateClinicTime(scheduledDateTime, dayjs)
    if (timeError) return setError(timeError)
    if (!confirmSafety) return setError('Vui lòng xác nhận bảo mật & an toàn dữ liệu trước khi đặt lịch')
    setSubmitting(true)
    setError('')
    try {
      await careSessionService.book({
        subscriptionId: Number(selectedSub),
        scheduledDateTime: scheduledDateTime.format('YYYY-MM-DDTHH:mm:ss'),
        notes,
      })
      alert('Đặt buổi khám thành công!')
      navigate('/patient/care-sessions')
    } catch (err) {
      setError(err.response?.data?.message || 'Đặt lịch thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '32px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>Đặt buổi khám</h1>
          <p style={{ color: '#64748b', margin: '0 0 24px', fontSize: 14 }}>
            Cung cấp thông tin để chúng tôi chuẩn bị tốt nhất cho buổi khám của bạn.
          </p>

          {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}

          {subscriptions.length === 0 ? (
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 40, textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <p style={{ color: '#64748b', marginBottom: 16 }}>Không có gói dịch vụ đang hoạt động nào</p>
              <button onClick={() => navigate('/services')} style={{ background: TEAL, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                Mua gói dịch vụ
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Chọn gói dịch vụ */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: 10, color: '#1e293b', fontSize: 14 }}>
                  Chọn gói dịch vụ <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {subscriptions.map((s) => {
                    const isSelected = String(s.id) === String(selectedSub)
                    return (
                      <div key={s.id} onClick={() => setSelectedSub(String(s.id))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12,
                          border: `2px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                          background: isSelected ? '#eff6ff' : '#fff', cursor: 'pointer', position: 'relative',
                        }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FiBookmark size={18} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{s.serviceName}</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Còn {s.remainingSessions}/{s.totalSessions} buổi khám</div>
                          {s.expiryDate && (
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <FiCalendar size={12} /> Hết hạn: {s.expiryDate}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 12, right: 12 }}>
                            <FiCheck size={13} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Ngày & giờ khám */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <label style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>
                    Ngày & Giờ khám <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>Giờ làm việc: {CLINIC_HOURS.openLabel} - {CLINIC_HOURS.closeLabel}</span>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ flex: '0 0 220px' }}>
                    <MiniCalendar month={month} onMonthChange={setMonth} selectedDate={selectedDate} onSelectDate={handleSelectDate} />
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      Khung giờ khám
                    </div>
                    {!selectedDate ? (
                      <div style={{ fontSize: 13, color: '#94a3b8' }}>Chọn một ngày trong lịch để xem khung giờ</div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                        {DAY_SLOTS.map((slot) => {
                          const disabled = isSlotDisabled(slot)
                          const isSelected = selectedSlot && selectedSlot.label === slot.label
                          return (
                            <button
                              type="button"
                              key={slot.label}
                              disabled={disabled}
                              onClick={() => setSelectedSlot(slot)}
                              style={{
                                padding: '8px 6px', borderRadius: 8, fontSize: 13, textAlign: 'center',
                                border: `1px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                                background: disabled ? '#f1f5f9' : isSelected ? '#eff6ff' : '#fff',
                                color: disabled ? '#cbd5e1' : isSelected ? '#2563eb' : '#334155',
                                cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: isSelected ? 700 : 400,
                              }}
                            >
                              {slot.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ghi chú thêm */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 8, color: '#1e293b', fontSize: 14 }}>
                  <FiFileText size={14} /> Ghi chú thêm
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Mô tả triệu chứng, yêu cầu đặc biệt..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              {/* Xác nhận bảo mật + submit */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                  <input type="checkbox" checked={confirmSafety} onChange={(e) => setConfirmSafety(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: TEAL }} />
                  <FiShield size={14} color={TEAL} /> Xác nhận bảo mật &amp; an toàn dữ liệu
                </label>
                <button type="submit" disabled={submitting}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: submitting ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none',
                    padding: '12px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}>
                  {submitting ? 'Đang xử lý...' : 'Xác nhận đặt lịch'} <FiArrowRight size={16} />
                </button>
              </div>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#94a3b8' }}>
          Bạn gặp khó khăn khi đặt lịch? <Link to="/support" style={{ color: TEAL, fontWeight: 600 }}>Liên hệ bộ phận hỗ trợ</Link>
        </div>
      </div>
    </div>
  )
}
