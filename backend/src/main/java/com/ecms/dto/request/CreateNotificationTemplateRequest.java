// UC-56 - Configure System and Data
package com.ecms.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateNotificationTemplateRequest {

    @NotBlank(message = "Template key không được để trống")
    private String templateKey;

    @NotBlank(message = "Channel không được để trống")
    private String channel; // EMAIL | SMS | IN_APP

    private String subject;

    @NotBlank(message = "Nội dung template không được để trống")
    private String body;

    private String variablesHint;
}
