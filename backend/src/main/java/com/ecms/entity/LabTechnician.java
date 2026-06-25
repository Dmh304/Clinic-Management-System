/**
 * Author: TuanTD
 * 
 * Đại diện cho thông tin của một Kỹ thuật viên phòng xét nghiệm (Lab Technician) trong hệ thống.
 * Quản lý các thông tin cá nhân, mã định danh chuyên môn, chứng chỉ hành nghề và tài khoản liên kết.
 */

package com.ecms.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "lab_technicians")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabTechnician {

    /* ID định danh duy nhất của kỹ thuật viên (Tự động tăng) */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Tài khoản người dùng (User) liên kết với kỹ thuật viên này để đăng nhập vào
     * hệ thống
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    /* Mã kỹ thuật viên xét nghiệm */
    @Column(name = "lab_tech_code", nullable = false)
    private String labTechCode;

    /* Họ và tên đầy đủ của kỹ thuật viên */
    @Column(name = "full_name", nullable = false)
    private String fullName;

    /* Số chứng chỉ hành nghề hoặc giấy phép hoạt động chuyên môn */
    @Column(name = "license_number")
    private String licenseNumber;

    /* Chuyên khoa */
    @Column(name = "specialization")
    private String specialization;

    /* Số điện thoại liên hệ */
    @Column(name = "phone_number")
    private String phoneNumber;

    /* Địa chỉ email */
    @Column(name = "email")
    private String email;

    /* Trạng thái hoạt động của kỹ thuật viên */
    @Column(name = "status")
    private String status;

    /* Thời điểm hồ sơ kỹ thuật viên được tạo trên hệ thống */
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /* Thời điểm cập nhật thông tin hồ sơ gần nhất */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /* Tự động gán thời điểm tạo hồ sơ trước khi lưu vào cơ sở dữ liệu lần đầu */
    @PrePersist
    private void prePersist() {
        createdAt = LocalDateTime.now();
    }

    /*
     * Tự động cập nhật thời điểm chỉnh sửa cuối cùng trước khi cập nhật vào cơ sở
     * dữ liệu
     */
    @PreUpdate
    private void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}