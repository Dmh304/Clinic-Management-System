// ThangNBHE201024
// Interface định nghĩa hợp đồng nghiệp vụ hóa đơn.
// Các method được triển khai trong InvoiceServiceImpl.
package com.ecms.service;

import com.ecms.dto.request.InvoiceRequest;
import com.ecms.dto.response.InvoiceResponse;

import java.util.List;

public interface InvoiceService {

    // Lấy tất cả hóa đơn (không kèm items — dùng cho danh sách)
    List<InvoiceResponse> getAllInvoices();

    // Tìm kiếm hóa đơn theo tên/SĐT bệnh nhân hoặc mã hóa đơn
    List<InvoiceResponse> searchInvoices(String keyword);

    // Lấy chi tiết một hóa đơn kèm đầy đủ danh sách khoản phí
    InvoiceResponse getInvoiceById(Long id);

    // Lấy hóa đơn theo appointmentId — dùng khi kiểm tra lịch hẹn đã có HĐ chưa
    InvoiceResponse getInvoiceByAppointmentId(Long appointmentId);

    // Tạo hóa đơn nháp (DRAFT) từ thông tin lịch hẹn và danh sách khoản phí
    InvoiceResponse createInvoice(InvoiceRequest request);

    // ThangNBHE201024 — Gợi ý khoản phí cho lịch hẹn (dịch vụ khám đã đặt + thuốc bác sĩ
    // đã kê) để đổ sẵn vào modal tạo hóa đơn. Không tạo hóa đơn, chỉ trả danh sách gợi ý.
    List<InvoiceRequest.InvoiceItemRequest> getSuggestedItems(Long appointmentId);

    // Phát hành hóa đơn (DRAFT → ISSUED) sau khi thu tiền thành công
    InvoiceResponse issueInvoice(Long id, String paymentMethod, String paymentReference);

    // Hủy hóa đơn (chỉ áp dụng cho trạng thái DRAFT)
    InvoiceResponse cancelInvoice(Long id);

    // ThangNBHE201024 - Chuẩn bị gửi hóa đơn điện tử (đồng bộ, nhanh):
    // kiểm tra bệnh nhân có email và đánh dấu tình trạng gửi = SENDING.
    // Việc gửi SMTP thực tế chạy nền qua InvoiceMailDispatcher.
    // Ném IllegalStateException nếu bệnh nhân chưa có email.
    void markEmailSending(Long id);

    // Cập nhật tình trạng gửi email sau khi worker nền gửi xong: SENT | FAILED.
    void markEmailStatus(Long id, String status);

    // Xuất hóa đơn dạng PDF theo id (load từ DB)
    byte[] generateInvoicePdf(Long id);

    // Xuất hóa đơn dạng PDF từ DTO đã load sẵn — tránh load DB lần 2
    byte[] generateInvoicePdf(InvoiceResponse inv);

    // Lấy danh sách hóa đơn của bệnh nhân đang đăng nhập — dùng cho trang "Hóa đơn của tôi"
    List<InvoiceResponse> getMyInvoices(Long patientId);
}
