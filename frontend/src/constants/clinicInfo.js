/**
 * Thông tin cố định của phòng khám (chỉ có 1 cơ sở duy nhất).
 *
 * ⚠️ ĐÂY LÀ NỘI DUNG MẪU (placeholder) — hệ thống chưa lưu địa chỉ phòng khám
 * ở đâu trong DB. Vui lòng sửa lại đúng tên/địa chỉ/hotline thật trước khi
 * triển khai thật, đừng để nguyên giá trị demo này.
 */
export const CLINIC_INFO = {
  name: 'Nhãn Khoa Ánh Sao',
  address: 'Số 123 Nguyễn Văn Cừ, Phường 4, Quận 5, TP. Hồ Chí Minh',
  hotline: '1900 0000',
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
