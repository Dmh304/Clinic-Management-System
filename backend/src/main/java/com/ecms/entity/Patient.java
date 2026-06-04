// Mạnh Hùng - HE200743
// Entity ánh xạ bảng "patients" trong database.
// Lưu trữ thông tin chi tiết của bệnh nhân: họ tên, ngày sinh, giới tính, địa chỉ,
// liên kết 1-1 với bảng User và mã bệnh nhân duy nhất.
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

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Tự động gán thời điểm tạo bản ghi trước khi lưu vào database lần đầu tiên
    @PrePersist
    private void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
