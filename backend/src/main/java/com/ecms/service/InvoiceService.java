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

    // Phát hành hóa đơn (DRAFT → ISSUED) sau khi thu tiền thành công
    InvoiceResponse issueInvoice(Long id, String paymentMethod, String paymentReference);

    // Hủy hóa đơn (chỉ áp dụng cho trạng thái DRAFT)
    InvoiceResponse cancelInvoice(Long id);

    // ThangNBHE201024 - Gửi hóa đơn điện tử qua email đến bệnh nhân
    // Ném IllegalStateException nếu bệnh nhân chưa có email; RuntimeException nếu SMTP thất bại
    void sendInvoiceEmail(Long id);

    // Xuất hóa đơn dạng PDF để tải về hoặc in
    byte[] generateInvoicePdf(Long id);
}
