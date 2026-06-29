// UC-56 - Configure System and Data
// Chỉ cho sửa subject/body/variablesHint — không cho đổi templateKey/channel sau khi tạo
// (templateKey là định danh cố định, có thể được hệ thống tham chiếu trực tiếp trong code).
package com.ecms.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateNotificationTemplateRequest {

    private String subject;

    @NotBlank(message = "Nội dung template không được để trống")
    private String body;

    private String variablesHint;
}
