// Mạnh Hùng - HE200743
// Controller cung cấp API quản lý bài viết blog của phòng khám.
// Hỗ trợ lấy danh sách tất cả bài đã đăng và xem chi tiết từng bài theo ID.
package com.ecms.controller;

import com.ecms.dto.response.BlogCategoryResponse;
import com.ecms.dto.response.BlogResponse;
import com.ecms.service.BlogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/blogs")
@RequiredArgsConstructor
public class BlogController {

    private final BlogService blogService;

    // Lấy danh sách tất cả bài blog có trạng thái PUBLISHED, sắp xếp mới nhất lên đầu
    // category: lọc theo slug danh mục (vd "cam-nang-suc-khoe"), bỏ qua để lấy tất cả
    @GetMapping
    public ResponseEntity<List<BlogResponse>> getAllBlogs(@RequestParam(required = false) String category) {
        return ResponseEntity.ok(blogService.getAllPublishedBlogs(category));
    }

    // Lấy danh sách danh mục bài viết blog (hiển thị sidebar) — public
    @GetMapping("/categories")
    public ResponseEntity<List<BlogCategoryResponse>> getAllCategories() {
        return ResponseEntity.ok(blogService.getAllCategories());
    }

    // Lấy chi tiết một bài blog theo ID; trả về 404 nếu không tìm thấy
    @GetMapping("/{id}")
    public ResponseEntity<BlogResponse> getBlogById(@PathVariable Long id) {
        return ResponseEntity.ok(blogService.getBlogById(id));
    }
}
