// Mạnh Hùng - HE200743
// DTO trả về thông tin bài viết blog: tiêu đề, tóm tắt, nội dung, tác giả, danh mục, ảnh, ngày đăng và trạng thái.
// Có phương thức tĩnh fromEntity() để chuyển đổi từ entity Blog sang DTO.
package com.ecms.dto.response;

import com.ecms.entity.Blog;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlogResponse {

    private Long id;
    private String title;
    private String summary;
    private String content;
    private String author;
    private String category;
    private String imageUrl;
    private LocalDateTime publishedAt;
    private String status;

    // Chuyển đổi entity Blog sang BlogResponse DTO để trả về cho client
    public static BlogResponse fromEntity(Blog blog) {
        return BlogResponse.builder()
                .id(blog.getId())
                .title(blog.getTitle())
                .summary(blog.getSummary())
                .content(blog.getContent())
                .author(blog.getAuthor())
                .category(blog.getCategory())
                .imageUrl(blog.getImageUrl())
                .publishedAt(blog.getPublishedAt())
                .status(blog.getStatus())
                .build();
    }
}
