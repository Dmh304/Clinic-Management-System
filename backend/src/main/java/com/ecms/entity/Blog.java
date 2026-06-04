// Mạnh Hùng - HE200743
// Entity ánh xạ bảng "blogs" trong database.
// Lưu trữ nội dung bài viết blog: tiêu đề, tóm tắt, nội dung đầy đủ, tác giả, danh mục,
// ảnh bìa, ngày đăng và trạng thái (PUBLISHED/DRAFT).
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "blogs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Blog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(length = 500)
    private String summary;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String content;

    private String author;

    private String category;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    // PUBLISHED | DRAFT
    private String status;
}
