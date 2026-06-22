package com.ecms.dto.response;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NurseResponse {
    private Long id;
    private String fullName;
    private String email;
    private String phone;
}
