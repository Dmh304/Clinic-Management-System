package com.ecms.dto.request;

import lombok.Data;

/* Cập nhật hồ sơ công khai của bác sĩ — MANAGER/ADMIN. Field null nghĩa là không thay đổi. */
@Data
public class UpdateDoctorProfileRequest {

    private String fullName;
    private String academicTitle;
    private String specialization;
    private String department;
    private String phone;
    private String email;
    private Integer experienceYears;
    private String bio;

    // Mỗi dòng là 1 thành tựu chuyên môn
    private String achievements;

    // Mỗi dòng dạng "Mốc thời gian|Nội dung"
    private String careerHistory;
}
