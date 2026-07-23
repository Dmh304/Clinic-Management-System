package com.ecms.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "doctors")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Doctor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;

    @Column(name = "doctor_code", nullable = false, unique = true, length = 20)
    private String doctorCode;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "license_number", nullable = false, unique = true, length = 100)
    private String licenseNumber;

    @Column(name = "specialty", nullable = false, length = 100)
    private String specialization;

    @Column(name = "academic_title", length = 150)
    private String academicTitle;

    @Column(name = "department")
    private String department;

    // Cột thật chứa SĐT là "phone_number"
    @Column(name = "phone_number", length = 15)
    private String phone;

    @Column(name = "email")
    private String email;

    @Column(name = "experience_years")
    private Integer experienceYears;

    @Column(name = "bio")
    private String bio;

    // Mỗi dòng là 1 thành tựu chuyên môn, hiển thị dạng checklist ở trang chi tiết
    @Column(name = "achievements", columnDefinition = "NVARCHAR(MAX)")
    private String achievements;

    // Mỗi dòng dạng "Mốc thời gian|Nội dung", hiển thị dạng timeline ở trang chi tiết
    @Column(name = "career_history", columnDefinition = "NVARCHAR(MAX)")
    private String careerHistory;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    // Có hiển thị ở khối "Bác sĩ - Chuyên gia" trên trang chủ hay không
    @Column(name = "featured", nullable = false)
    private Boolean featured;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Tự động gán thời điểm tạo hồ sơ trước khi lưu vào DB lần đầu
    @PrePersist
    private void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = "ACTIVE";
        if (featured == null) featured = false;
    }

    @PreUpdate
    private void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
