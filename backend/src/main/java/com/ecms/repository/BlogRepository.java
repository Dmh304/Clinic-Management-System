// Mạnh Hùng - HE200743
// Repository cung cấp truy vấn lấy bài viết blog theo trạng thái và sắp xếp theo ngày đăng.
// Dùng để lấy danh sách bài đã công bố hiển thị trên trang blog.
package com.ecms.repository;

import com.ecms.entity.BlogPost;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BlogRepository extends JpaRepository<BlogPost, Long> {

    // Lấy danh sách bài blog theo trạng thái (ví dụ: "PUBLISHED"), sắp xếp ngày đăng mới nhất lên đầu
    List<BlogPost> findByStatusOrderByPublishedAtDesc(String status);
}
