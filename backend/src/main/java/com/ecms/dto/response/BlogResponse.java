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
