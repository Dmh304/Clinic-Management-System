package com.ecms.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffResponse {
    private Long id;
    private String employeeCode;
    private String fullName;
    private String department;
    private String position;
    private String phoneNumber;
    private String status;
}