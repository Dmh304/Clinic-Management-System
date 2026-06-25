// DucTKH
// Entity đại diện cho bảng prescriptions trong cơ sở dữ liệu.
// Lưu trữ thông tin một đơn thuốc chung, được liên kết với một hồ sơ bệnh án (MedicalRecord).
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "prescriptions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medical_record_id", nullable = false)
    private MedicalRecord medicalRecord;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PrescriptionStatus status;

    @Column(columnDefinition = "NVARCHAR(500)")
    private String notes;

    @OneToMany(mappedBy = "prescription", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PrescriptionItem> items = new ArrayList<>();

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        // DucTKH: Thiết lập thời gian tạo và cập nhật mặc định
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        // DucTKH: Điều kiện - Nếu trạng thái chưa được set, mặc định là PENDING (Chưa phát)
        if (status == null) status = PrescriptionStatus.PENDING;
    }

    // Cập nhật lại thời gian sửa đổi
    @PreUpdate
    protected void onUpdate() {
        // DucTKH: Tự động cập nhật thời gian mỗi khi thay đổi
        updatedAt = LocalDateTime.now();
    }
}
