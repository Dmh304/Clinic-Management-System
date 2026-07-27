// Mạnh Hùng - HE200743
// DTO trả về thông tin danh mục bài viết blog: tên, slug, thứ tự hiển thị.
package com.ecms.dto.response;

import com.ecms.entity.BlogCategory;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlogCategoryResponse {

    private Long id;
    private String name;
    private String slug;
    private Integer displayOrder;

    public static BlogCategoryResponse fromEntity(BlogCategory category) {
        return BlogCategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .slug(category.getSlug())
                .displayOrder(category.getDisplayOrder())
                .build();
    }
}
