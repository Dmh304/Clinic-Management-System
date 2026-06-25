package com.ecms.dto.request;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UpdateAppointmentNotesRequest {

    private String notes;
}
