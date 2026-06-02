package com.ecms.dto.response;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DoctorResponse {
    private Long id;
    private String fullName;
    private String specialization;
    private String phone;
    private String email;
}
