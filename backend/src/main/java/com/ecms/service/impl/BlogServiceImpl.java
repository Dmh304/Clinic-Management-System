// Mạnh Hùng - HE200743
// Triển khai nghiệp vụ quản lý bài viết blog.
// Hỗ trợ lấy danh sách blog đã công bố và truy vấn chi tiết từng bài theo ID.
package com.ecms.service.impl;

import com.ecms.dto.response.BlogResponse;
import com.ecms.entity.BlogPost;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.BlogRepository;
import com.ecms.service.BlogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BlogServiceImpl implements BlogService {

    private final BlogRepository blogRepository;

    // Truy vấn tất cả bài blog có status=PUBLISHED từ database, chuyển sang DTO và trả về danh sách
    @Override
    public List<BlogResponse> getAllPublishedBlogs() {
        return blogRepository.findByStatusOrderByPublishedAtDesc("PUBLISHED")
                .stream()
                .map(BlogResponse::fromEntity)
                .toList();
    }

    // Tìm bài blog theo ID và chuyển sang DTO; ném ResourceNotFoundException nếu không tìm thấy
    @Override
    public BlogResponse getBlogById(Long id) {
        BlogPost post = blogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Blog not found with id: " + id));
        return BlogResponse.fromEntity(post);
    }
}
