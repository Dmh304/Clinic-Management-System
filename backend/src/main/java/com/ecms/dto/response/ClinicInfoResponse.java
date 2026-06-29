// UC-56 - Configure System and Data
package com.ecms.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClinicInfoResponse {
    private String clinicName;
    private String clinicPhone;
    private String clinicAddress;
    private String clinicHours;
    private LocalDateTime updatedAt;
}
