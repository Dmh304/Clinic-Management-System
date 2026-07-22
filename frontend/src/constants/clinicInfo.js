/**
 * Tạo ngày 21/07/2026
 * Thông tin cố định của phòng khám (chỉ có 1 cơ sở duy nhất).
 */
export const CLINIC_INFO = {
  name: 'Nhãn Khoa Ánh Sao',
  address: 'Số 123 Nguyễn Văn Cừ, Phường 4, Quận 5, TP. Hồ Chí Minh',
  hotline: '0824569414',
  zalo: 'https://zalo.me/0824569414',
}

/**
 * Giờ làm việc của phòng khám — mở 07:30, đóng 17:00. Dùng chung cho mọi flow
 * đặt lịch/đặt buổi dịch vụ để không cho đặt ngoài giờ hành chính. PHẢI đồng bộ
 * với hằng số CLINIC_OPEN_TIME/CLINIC_CLOSE_TIME ở backend (CareSessionServiceImpl).
 */
export const CLINIC_HOURS = {
  openHour: 7,
  openMinute: 30,
  closeHour: 17,
  closeMinute: 0,
  openLabel: '07:30',
  closeLabel: '17:00',
}

/**
 * Kiểm tra một mốc thời gian (dayjs) có nằm trong giờ làm việc phòng khám không.
 * Trả về chuỗi lỗi nếu không hợp lệ, hoặc null nếu hợp lệ.
 */
export function validateClinicTime(d, dayjs) {
  if (!d) return 'Vui lòng chọn ngày giờ'
  if (d.isBefore(dayjs())) return 'Thời gian phải trong tương lai, không được đặt trong quá khứ'
  const open = d.hour(CLINIC_HOURS.openHour).minute(CLINIC_HOURS.openMinute).second(0)
  const close = d.hour(CLINIC_HOURS.closeHour).minute(CLINIC_HOURS.closeMinute).second(0)
  if (d.isBefore(open) || d.isAfter(close)) {
    return `Chỉ đặt trong giờ làm việc của phòng khám (${CLINIC_HOURS.openLabel}–${CLINIC_HOURS.closeLabel})`
  }
  return null
}

/**
 * Chặn chọn ngày quá khứ trên DatePicker — dùng chung cho mọi form đặt lịch/buổi khám
 * để đồng bộ hành vi trong toàn hệ thống.
 */
export function disabledClinicDate(current, dayjs) {
  return current && current < dayjs().startOf('day')
}

/**
 * Chặn chọn giờ ngoài giờ làm việc phòng khám (07:30–17:00) và giờ/phút đã qua nếu là hôm nay.
 * Dùng cho prop disabledTime của antd DatePicker (kèm showTime để hiển thị 24h, không AM/PM).
 */
export function disabledClinicTime(current, dayjs) {
  const isToday = current && current.isSame(dayjs(), 'day')
  return {
    disabledHours: () => {
      const hours = []
      for (let h = 0; h < 24; h++) {
        if (h < CLINIC_HOURS.openHour || h > CLINIC_HOURS.closeHour) hours.push(h)
      }
      if (isToday) {
        for (let h = 0; h < dayjs().hour(); h++) if (!hours.includes(h)) hours.push(h)
      }
      return hours
    },
    disabledMinutes: (selectedHour) => {
      const mins = []
      if (selectedHour === CLINIC_HOURS.openHour) for (let m = 0; m < CLINIC_HOURS.openMinute; m++) mins.push(m)
      if (selectedHour === CLINIC_HOURS.closeHour) for (let m = CLINIC_HOURS.closeMinute + 1; m < 60; m++) mins.push(m)
      if (isToday && selectedHour === dayjs().hour()) for (let m = 0; m <= dayjs().minute(); m++) if (!mins.includes(m)) mins.push(m)
      return mins
    },
  }
}
