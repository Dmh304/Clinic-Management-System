// Mạnh Hùng - HE200743
// Entity ánh xạ bảng "blog_categories" trong database.
// Danh mục bài viết blog hiển thị ở sidebar trang Blog (Tin tức - sự kiện, Cẩm nang sức khỏe,...).
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "blog_categories")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlogCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 300)
    private String name;

    @Column(unique = true, length = 200)
    private String slug;

    @Column(name = "display_order")
    private Integer displayOrder;

    @PrePersist
    private void prePersist() {
        if (this.displayOrder == null) this.displayOrder = 0;
    }
}
