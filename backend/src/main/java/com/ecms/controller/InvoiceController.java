package com.ecms.controller;

import com.ecms.dto.request.InvoiceRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.InvoiceResponse;
import com.ecms.entity.Patient;
import com.ecms.entity.User;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.PatientRepository;
import com.ecms.repository.UserRepository;
import com.ecms.service.InvoiceService;
import com.ecms.service.impl.InvoiceMailDispatcher;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ThangNBHE201024
 *
 * REST Controller xử lý toàn bộ các yêu cầu HTTP liên quan đến hóa đơn.
 * Base URL: /api/v1/invoices
 * Quyền truy cập: ADMIN, RECEPTIONIST, MANAGER (cấu hình trong SecurityConfig).
 *
 * Danh sách endpoint:
 *   GET    /                        — Lấy tất cả hóa đơn
 *   GET    /search?keyword=         — Tìm kiếm hóa đơn
 *   GET    /{id}                    — Chi tiết hóa đơn kèm khoản phí
 *   GET    /appointment/{id}        — Hóa đơn theo lịch hẹn
 *   POST   /                        — Tạo hóa đơn nháp
 *   PATCH  /{id}/issue              — Phát hành hóa đơn (thu tiền)
 *   PATCH  /{id}/cancel             — Hủy hóa đơn nháp
 *   POST   /{id}/send-email         — Gửi hóa đơn qua email
 *   GET    /my                       — Hóa đơn của bệnh nhân đang đăng nhập
 *   GET    /{id}/pdf                — Tải xuống hóa đơn PDF
 */
@RestController
@RequestMapping("/api/v1/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final InvoiceMailDispatcher invoiceMailDispatcher;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;

    // Lấy danh sách tất cả hóa đơn (không kèm items) — dùng cho tab Lịch sử hóa đơn
    @GetMapping
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> getAllInvoices() {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.getAllInvoices()));
    }

    // Hóa đơn của bệnh nhân đang đăng nhập — dùng cho trang "Hóa đơn của tôi" (PATIENT)
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> getMyInvoices(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));
        Patient patient = patientRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ bệnh nhân"));
        return ResponseEntity.ok(ApiResponse.success(invoiceService.getMyInvoices(patient.getId())));
    }

    // Tìm kiếm hóa đơn theo tên, SĐT bệnh nhân hoặc mã hóa đơn
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> searchInvoices(
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.searchInvoices(keyword)));
    }

    // Lấy chi tiết một hóa đơn kèm danh sách khoản phí — dùng khi mở modal chi tiết, in, gửi email
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoiceById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.getInvoiceById(id)));
    }

    // Tìm hóa đơn theo appointmentId — dùng khi kiểm tra lịch hẹn đã có HĐ chưa
    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoiceByAppointment(
            @PathVariable Long appointmentId) {
        return ResponseEntity.ok(
                ApiResponse.success(invoiceService.getInvoiceByAppointmentId(appointmentId)));
    }

    // ThangNBHE201024 — Gợi ý khoản phí cho lịch hẹn: dịch vụ khám đã đặt + thuốc bác sĩ
    // đã kê (UC-27). Frontend gọi khi mở modal "Thu phí" để đổ sẵn, lễ tân không nhập tay.
    @GetMapping("/appointment/{appointmentId}/suggested-items")
    public ResponseEntity<ApiResponse<List<InvoiceRequest.InvoiceItemRequest>>> getSuggestedItems(
            @PathVariable Long appointmentId) {
        return ResponseEntity.ok(
                ApiResponse.success(invoiceService.getSuggestedItems(appointmentId)));
    }

    // Tạo hóa đơn nháp (DRAFT) từ danh sách khoản phí do lễ tân nhập
    @PostMapping
    public ResponseEntity<ApiResponse<InvoiceResponse>> createInvoice(
            @Valid @RequestBody InvoiceRequest request) {
        try {
            return ResponseEntity.ok(ApiResponse.success(invoiceService.createInvoice(request)));
        } catch (DataIntegrityViolationException e) {
            throw new IllegalStateException("Mã hóa đơn bị trùng do tạo đồng thời, vui lòng thử lại");
        }
    }

    // Phát hành hóa đơn sau khi thu tiền: DRAFT → ISSUED, paymentStatus → PAID
    @PatchMapping("/{id}/issue")
    public ResponseEntity<ApiResponse<InvoiceResponse>> issueInvoice(
            @PathVariable Long id,
            @RequestBody(required = false) IssueRequest body) {
        String method = body != null ? body.getPaymentMethod() : null;
        String ref = body != null ? body.getPaymentReference() : null;
        return ResponseEntity.ok(ApiResponse.success(invoiceService.issueInvoice(id, method, ref)));
    }

    // Hủy hóa đơn nháp — chỉ cho phép khi trạng thái là DRAFT
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<InvoiceResponse>> cancelInvoice(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.cancelInvoice(id)));
    }

    // ThangNBHE201024 - Gửi hóa đơn điện tử qua email đến bệnh nhân
    // Đồng bộ: kiểm tra email + đánh dấu tình trạng gửi = SENDING, trả về ngay.
    // Việc gửi SMTP (Gmail) chạy nền qua InvoiceMailDispatcher để không treo
    // thread request khi SMTP chậm; tình trạng gửi (SENT/FAILED) cập nhật sau.
    @PostMapping("/{id}/send-email")
    public ResponseEntity<ApiResponse<Void>> sendEmail(@PathVariable Long id) {
        invoiceService.markEmailSending(id);
        invoiceMailDispatcher.dispatch(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // Tải xuống hóa đơn dạng PDF — trả về file với Content-Disposition inline để trình duyệt hiển thị
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long id) {
        InvoiceResponse inv = invoiceService.getInvoiceById(id);
        byte[] pdf = invoiceService.generateInvoicePdf(inv);
        String filename = "hoa-don-" + inv.getInvoiceCode() + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(pdf);
    }

    // DTO nội bộ nhận paymentMethod và paymentReference khi phát hành hóa đơn
    @Data
    public static class IssueRequest {
        private String paymentMethod;
        private String paymentReference;
    }
}
