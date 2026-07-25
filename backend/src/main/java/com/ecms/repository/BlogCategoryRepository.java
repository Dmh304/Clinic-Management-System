// Mạnh Hùng - HE200743
// Repository cung cấp truy vấn danh mục bài viết blog, sắp xếp theo display_order.
package com.ecms.repository;

import com.ecms.entity.BlogCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BlogCategoryRepository extends JpaRepository<BlogCategory, Long> {

    List<BlogCategory> findAllByOrderByDisplayOrderAsc();
}
