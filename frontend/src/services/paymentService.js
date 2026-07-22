// ThangNBHE201024 - HE187030
// Gọi API thanh toán tự động qua VietQR (UC-22 Process Payment).
//
// Luồng: lễ tân tạo hóa đơn nháp → hiện mã QR có nội dung là mã hóa đơn →
// bệnh nhân quét & chuyển khoản → cổng thanh toán bắn webhook về backend →
// backend tự gạch nợ → frontend polling getStatus() thấy paid = true.
import axiosClient from '../api/axiosClient'

export const paymentService = {
	// Kiểm tra hóa đơn đã được cổng thanh toán xác nhận chưa.
	// Frontend gọi mỗi 3 giây trong lúc hiển thị mã QR.
	getStatus: (invoiceId) => axiosClient.get(`/v1/payments/invoice/${invoiceId}/status`),
}
