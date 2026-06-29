// UC-55 - Manage User Account
package com.ecms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffUserResponse {
    private Long id;
    private String fullName;
    private String email;
    private String role;
    private String department;
    private String status;
    private LocalDateTime createdAt;
}
