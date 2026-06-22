package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "discount_campaigns")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DiscountCampaign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, columnDefinition = "NVARCHAR(200)")
    private String name;

    @Column(columnDefinition = "NVARCHAR(500)")
    private String description;

    /** PERCENTAGE | FIXED_AMOUNT | VOUCHER */
    @Column(name = "type", length = 20, nullable = false)
    private String type;

    /** Giá trị giảm: % (0-100) hoặc số tiền cố định */
    @Column(name = "value", nullable = false)
    private BigDecimal value;

    /** Mã voucher (duy nhất, chỉ dùng khi type=VOUCHER) */
    @Column(name = "voucher_code", unique = true, length = 50)
    private String voucherCode;

    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom;

    @Column(name = "valid_to", nullable = false)
    private LocalDate validTo;

    /** Giá trị đơn hàng tối thiểu để áp dụng (null = không giới hạn) */
    @Column(name = "min_purchase_amount")
    private BigDecimal minPurchaseAmount;

    /** Số lần dùng tối đa (null = không giới hạn) */
    @Column(name = "max_usage_count")
    private Integer maxUsageCount;

    @Column(name = "used_count", nullable = false)
    private Integer usedCount;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    private void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.usedCount == null) this.usedCount = 0;
        if (this.isActive == null) this.isActive = true;
    }

    @PreUpdate
    private void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
