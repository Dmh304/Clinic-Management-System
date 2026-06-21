// Mạnh Hùng - HE200743
// DTO trả về thông tin bài viết blog: tiêu đề, slug, nội dung, tác giả, ảnh đại diện, ngày đăng và trạng thái.
// Có phương thức tĩnh fromEntity() để chuyển đổi từ entity BlogPost sang DTO.
package com.ecms.dto.response;

import com.ecms.entity.BlogPost;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlogResponse {

    private Long id;
    private String title;
    private String slug;
    private String content;
    private String author;
    private String thumbnailUrl;
    private LocalDateTime publishedAt;
    private String status;

    // Chuyển đổi entity BlogPost sang BlogResponse DTO để trả về cho client
    public static BlogResponse fromEntity(BlogPost post) {
        return BlogResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .slug(post.getSlug())
                .content(post.getContent())
                .author(post.getAuthor() != null ? post.getAuthor().getFullName() : null)
                .thumbnailUrl(post.getThumbnailUrl())
                .publishedAt(post.getPublishedAt())
                .status(post.getStatus())
                .build();
    }
}
