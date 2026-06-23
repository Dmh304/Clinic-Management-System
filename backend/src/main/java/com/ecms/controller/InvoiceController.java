package com.ecms.controller;

import com.ecms.dto.request.InvoiceRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.InvoiceResponse;
import com.ecms.service.InvoiceService;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> getAllInvoices() {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.getAllInvoices()));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> searchInvoices(
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.searchInvoices(keyword)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoiceById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.getInvoiceById(id)));
    }

    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoiceByAppointment(
            @PathVariable Long appointmentId) {
        return ResponseEntity.ok(
                ApiResponse.success(invoiceService.getInvoiceByAppointmentId(appointmentId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<InvoiceResponse>> createInvoice(
            @Valid @RequestBody InvoiceRequest request) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.createInvoice(request)));
    }

    @PatchMapping("/{id}/issue")
    public ResponseEntity<ApiResponse<InvoiceResponse>> issueInvoice(
            @PathVariable Long id,
            @RequestBody(required = false) IssueRequest body) {
        String method = body != null ? body.getPaymentMethod() : null;
        String ref = body != null ? body.getPaymentReference() : null;
        return ResponseEntity.ok(ApiResponse.success(invoiceService.issueInvoice(id, method, ref)));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<InvoiceResponse>> cancelInvoice(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.cancelInvoice(id)));
    }

    @PostMapping("/{id}/send-email")
    public ResponseEntity<ApiResponse<Void>> sendEmail(@PathVariable Long id) {
        invoiceService.sendInvoiceEmail(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long id) {
        InvoiceResponse inv = invoiceService.getInvoiceById(id);
        byte[] pdf = invoiceService.generateInvoicePdf(id);
        String filename = "hoa-don-" + inv.getInvoiceCode() + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(pdf);
    }

    @Data
    public static class IssueRequest {
        private String paymentMethod;
        private String paymentReference;
    }
}
