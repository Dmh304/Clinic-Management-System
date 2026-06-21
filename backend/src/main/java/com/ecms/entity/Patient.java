// Le Thi Bich Ngan - HE204710
// Entity ánh xạ bảng patients trong cơ sở dữ liệu.
// Lưu trữ hồ sơ y tế của bệnh nhân gồm: mã bệnh nhân tự sinh (PT0001, PT0002,...),
// thông tin cá nhân (họ tên, ngày sinh, giới tính, địa chỉ, liên hệ)
// và liên kết 1-1 với tài khoản đăng nhập trong bảng users.

package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "patients")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Liên kết 1-1 với tài khoản người dùng (bảng users)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    // Mã bệnh nhân dạng PT0001, PT0002,... - tự sinh trong PatientServiceImpl
    @Column(name = "patient_code", unique = true, length = 20)
    private String patientCode;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    // Giá trị lưu trong DB theo chuẩn: MALE, FEMALE, OTHER
    @Column(name = "gender")
    private String gender;

    @Column(name = "phone")
    private String phone;

    @Column(name = "email")
    private String email;

    @Column(name = "address")
    private String address;

    @Column(name = "cccd", length = 12)
    private String cccd;

    @Column(name = "emergency_contact_name")
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone", length = 15)
    private String emergencyContactPhone;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Tự động gán thời điểm tạo hồ sơ trước khi lưu vào DB lần đầu
    @PrePersist
    private void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
