// DucTKH
// Entity đại diện cho bảng invoices trong cơ sở dữ liệu.
// Dùng để lưu trữ thông tin hóa đơn (bao gồm tiền khám, tiền thuốc, v.v.).
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "invoices")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(name = "sub_total", nullable = false)
    private BigDecimal subTotal;

    @Column(name = "discount_amount", nullable = false)
    private BigDecimal discountAmount;

    @Column(name = "tax", nullable = false)
    private BigDecimal tax;

    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "payment_status", nullable = false)
    private String paymentStatus;

    @Column(name = "payment_reference")
    private String paymentReference;

    @Column(name = "pdf_url")
    private String pdfUrl;

    @Column(name = "issued_by")
    private Long issuedBy;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "generated_at")
    private LocalDateTime generatedAt;

    @Column(nullable = false)
    private String status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InvoiceItem> items = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        // DucTKH: Gán thời gian tạo mặc định khi bản ghi mới được lưu vào database
        createdAt = LocalDateTime.now();
        // DucTKH: Điều kiện - Nếu chưa có trạng thái, mặc định là bản nháp (DRAFT)
        if (status == null) status = "DRAFT";
        // DucTKH: Điều kiện - Nếu chưa có trạng thái thanh toán, mặc định là chưa thanh toán (UNPAID)
        if (paymentStatus == null) paymentStatus = "UNPAID";
        // DucTKH: Điều kiện - Đảm bảo các giá trị tiền tệ không bị null để tránh lỗi tính toán
        if (subTotal == null) subTotal = BigDecimal.ZERO;
        if (discountAmount == null) discountAmount = BigDecimal.ZERO;
        if (tax == null) tax = BigDecimal.ZERO;
        if (totalAmount == null) totalAmount = BigDecimal.ZERO;
    }

    @PreUpdate
    protected void onUpdate() {
        // DucTKH: Tự động cập nhật thời gian mỗi khi bản ghi có sự thay đổi
        updatedAt = LocalDateTime.now();
    }
}
