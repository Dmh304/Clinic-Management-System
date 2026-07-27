/**
 * @author  ThangNB - HE201024
 * @created 2026-07-27
 *
 * Kiểu chữ dùng chung cho khu vực Clinic Manager — một nguồn duy nhất để 15 trang
 * không lệch cỡ chữ tiêu đề như trước.
 *
 * KHÔNG khai báo fontFamily: để chữ kế thừa biến --sans ở index.css.
 */

/** Tiêu đề chính của một trang manager. Dùng cho đúng MỘT phần tử trên mỗi trang. */
export const pageTitle = {
  fontSize: 24,
  fontWeight: 700,
  color: '#1e293b',
  letterSpacing: '-0.01em',
  margin: 0,
}

/** Dòng mô tả ngay dưới tiêu đề trang. */
export const pageSubtitle = {
  fontSize: 14,
  color: '#64748b',
  marginTop: 4,
}
