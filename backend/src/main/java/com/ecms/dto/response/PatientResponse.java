// Le Thi Bich Ngan - HE204710
// DTO trả về thông tin bệnh nhân sau khi tạo hoặc tìm kiếm thành công.
// Dùng làm dữ liệu trả về cho cả createWalkInPatient và searchPatients.

package com.ecms.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PatientResponse {

    private Long id;
    private String fullName;
    private String phone;
    private String email;
    private LocalDate dateOfBirth;
    private String gender;
    private String address;
    private LocalDateTime createdAt;
}
