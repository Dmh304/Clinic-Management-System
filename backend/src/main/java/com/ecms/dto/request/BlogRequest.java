// Mạnh Hùng - HE200743
// DTO nhận dữ liệu tạo/cập nhật bài viết blog từ trang quản lý (Manager).
package com.ecms.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BlogRequest {

    @NotBlank(message = "Vui lòng nhập tiêu đề")
    private String title;

    @NotBlank(message = "Vui lòng nhập nội dung")
    private String content;

    private String thumbnailUrl;

    private Long categoryId;

    // DRAFT | PUBLISHED | ARCHIVED — để trống mặc định DRAFT
    private String status;
}
