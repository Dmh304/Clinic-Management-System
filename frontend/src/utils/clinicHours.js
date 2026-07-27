// src/utils/clinicHours.js
// Đồng bộ với ClinicHoursUtil.java (backend) — 07:30–17:00, trừ Chủ nhật.
export function isWithinClinicHours(date = new Date()) {
  const day = date.getDay() // 0 = Chủ nhật
  if (day === 0) return false
  const minutes = date.getHours() * 60 + date.getMinutes()
  const open = 7 * 60 + 30
  const close = 17 * 60
  return minutes >= open && minutes <= close
}

export function isSameDayAsToday(dateInput) {
  if (!dateInput) return false
  const d = new Date(dateInput)
  const today = new Date()
  return d.getFullYear() === today.getFullYear()
      && d.getMonth() === today.getMonth()
      && d.getDate() === today.getDate()
}

export const CLINIC_HOURS_MESSAGE =
  'Thao tác này chỉ được thực hiện trong giờ làm việc của phòng khám (07:30–17:00, trừ Chủ nhật).'