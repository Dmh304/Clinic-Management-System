// Mạnh Hùng - HE200743
// Interface định nghĩa các hành vi quản lý bài viết blog: lấy danh sách bài đã đăng và xem chi tiết.
// Được triển khai bởi BlogServiceImpl.
package com.ecms.service;

import com.ecms.dto.response.BlogResponse;

import java.util.List;

public interface BlogService {

    // Lấy danh sách tất cả bài blog có trạng thái PUBLISHED, sắp xếp theo ngày đăng mới nhất
    List<BlogResponse> getAllPublishedBlogs();

    // Lấy chi tiết một bài blog theo ID; ném ngoại lệ nếu không tìm thấy
    BlogResponse getBlogById(Long id);
}
