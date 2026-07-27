/**
 * @author  ThangNB - HE201024
 * @created 2026-07-27
 *
 * Kiểu chữ dùng chung cho khu vực Clinic Manager — một nguồn duy nhất để 15 trang
 * không lệch cỡ chữ tiêu đề như trước.
 *
 * KHÔNG khai báo fontFamily: để chữ kế thừa biến --sans ở index.css.
 */

/** Tiêu đề chính của một trang manager. Dùng cho đúng MỘT phần tử trên mỗi trang.
 *  Giá trị lấy theo bản restyle của nhánh test-branch (20px/700/#0f172a) để giao diện
 *  khớp với phần còn lại của hệ thống sau merge. */
export const pageTitle = {
  fontSize: 20,
  fontWeight: 700,
  color: '#0f172a',
  margin: 0,
}

/** Dòng mô tả ngay dưới tiêu đề trang. */
export const pageSubtitle = {
  fontSize: 13,
  color: '#64748b',
  margin: '4px 0 0',
}
