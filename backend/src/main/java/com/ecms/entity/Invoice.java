// DucTKH
// Entity đại diện cho bảng invoices trong cơ sở dữ liệu.
// Dùng để lưu trữ thông tin hóa đơn (bao gồm tiền khám, tiền thuốc, v.v.).
package com.ecms.entity;

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

    @Column(name = "invoice_code", unique = true, length = 30)
    private String invoiceCode;

    // --- CÁC PHÍ DỊCH VỤ (Từ nhánh main) ---
    @Column(name = "service_fee", precision = 12, scale = 2)
    private BigDecimal serviceFee;

    @Column(name = "lab_fee", precision = 12, scale = 2)
    private BigDecimal labFee;

    @Column(name = "medicine_fee", precision = 12, scale = 2)
    private BigDecimal medicineFee;

    // --- CÁC PHÍ CỦA PHẦN DƯỢC (Từ nhánh Duc) ---
    @Column(name = "sub_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal subTotal;

    @Column(name = "discount_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "tax", nullable = false, precision = 12, scale = 2)
    private BigDecimal tax;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    // --- THANH TOÁN ---
    // CASH | VIET_QR
    @Column(name = "payment_method", length = 20)
    private String paymentMethod;

    @Column(name = "payment_reference", length = 100)
    private String paymentReference;

    // UNPAID | PAID | PAYMENT_FAILED
    @Column(name = "payment_status", nullable = false, length = 20)
    private String paymentStatus;

    @Column(name = "pdf_url")
    private String pdfUrl;

    // --- TRẠNG THÁI & GHI CHÚ ---
    // DRAFT | ISSUED | CANCELLED
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "notes", columnDefinition = "NVARCHAR(MAX)")
    private String notes;

    @Column(name = "issued_by")
    private Long issuedBy;

    // --- THỜI GIAN ---
    @Column(name = "generated_at")
    private LocalDateTime generatedAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<InvoiceItem> items = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        // Gán thời gian tạo mặc định
        createdAt = LocalDateTime.now();
        
        // Trạng thái chung
        if (status == null) status = "DRAFT";
        if (paymentStatus == null) paymentStatus = "UNPAID";
        
        // Khởi tạo các giá trị tiền tệ của hệ thống Dược (nhánh Duc)
        if (subTotal == null) subTotal = BigDecimal.ZERO;
        if (discountAmount == null) discountAmount = BigDecimal.ZERO;
        if (tax == null) tax = BigDecimal.ZERO;
        
        // Khởi tạo các giá trị tiền tệ của hệ thống Khám bệnh/Xét nghiệm (nhánh main)
        if (serviceFee == null) serviceFee = BigDecimal.ZERO;
        if (labFee == null) labFee = BigDecimal.ZERO;
        if (medicineFee == null) medicineFee = BigDecimal.ZERO;
        
        // Tổng tiền
        if (totalAmount == null) totalAmount = BigDecimal.ZERO;
    }

    @PreUpdate
    protected void onUpdate() {
        // Tự động cập nhật thời gian
        updatedAt = LocalDateTime.now();
    }
}
