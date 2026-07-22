// Mạnh Hùng - HE200743
// Triển khai nghiệp vụ quản lý bài viết blog.
// Hỗ trợ lấy danh sách blog đã công bố (có thể lọc theo danh mục), truy vấn chi tiết từng bài theo ID,
// và lấy danh sách danh mục blog.
package com.ecms.service.impl;

import com.ecms.dto.response.BlogCategoryResponse;
import com.ecms.dto.response.BlogResponse;
import com.ecms.entity.BlogPost;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.BlogCategoryRepository;
import com.ecms.repository.BlogRepository;
import com.ecms.service.BlogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BlogServiceImpl implements BlogService {

    private final BlogRepository blogRepository;
    private final BlogCategoryRepository blogCategoryRepository;

    // Truy vấn tất cả bài blog có status=PUBLISHED từ database (lọc theo danh mục nếu có), chuyển sang DTO và trả về danh sách
    // @Transactional giữ session mở khi map sang DTO, vì BlogResponse.fromEntity() truy cập
    // post.getAuthor() / post.getCategory() là quan hệ LAZY (nếu không sẽ ném LazyInitializationException do open-in-view=false)
    @Override
    @Transactional(readOnly = true)
    public List<BlogResponse> getAllPublishedBlogs(String categorySlug) {
        List<BlogPost> posts = (categorySlug == null || categorySlug.isBlank())
                ? blogRepository.findByStatusOrderByPublishedAtDesc("PUBLISHED")
                : blogRepository.findByStatusAndCategory_SlugOrderByPublishedAtDesc("PUBLISHED", categorySlug);
        return posts.stream()
                .map(BlogResponse::fromEntity)
                .toList();
    }

    // Tìm bài blog theo ID và chuyển sang DTO; ném ResourceNotFoundException nếu không tìm thấy
    @Override
    @Transactional(readOnly = true)
    public BlogResponse getBlogById(Long id) {
        BlogPost post = blogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Blog not found with id: " + id));
        return BlogResponse.fromEntity(post);
    }

    // Lấy danh sách danh mục blog, sắp xếp theo display_order
    @Override
    @Transactional(readOnly = true)
    public List<BlogCategoryResponse> getAllCategories() {
        return blogCategoryRepository.findAllByOrderByDisplayOrderAsc()
                .stream()
                .map(BlogCategoryResponse::fromEntity)
                .toList();
    }
}
