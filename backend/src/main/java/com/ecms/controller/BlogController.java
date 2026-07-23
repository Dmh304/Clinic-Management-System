// Mạnh Hùng - HE200743
// Controller cung cấp API quản lý bài viết blog của phòng khám.
// Hỗ trợ lấy danh sách tất cả bài đã đăng, xem chi tiết từng bài theo ID (public),
// và CRUD bài viết cho trang quản lý (MANAGER/ADMIN).
package com.ecms.controller;

import com.ecms.dto.request.BlogRequest;
import com.ecms.dto.response.BlogCategoryResponse;
import com.ecms.dto.response.BlogResponse;
import com.ecms.service.BlogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/blogs")
@RequiredArgsConstructor
public class BlogController {

    private final BlogService blogService;

    // Lấy danh sách tất cả bài blog có trạng thái PUBLISHED, sắp xếp mới nhất lên đầu — public
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

    // Lấy chi tiết một bài blog theo ID; trả về 404 nếu không tìm thấy — public
    @GetMapping("/{id}")
    public ResponseEntity<BlogResponse> getBlogById(@PathVariable Long id) {
        return ResponseEntity.ok(blogService.getBlogById(id));
    }

    // ── Manager CRUD ──────────────────────────────────────────────

    // Lấy toàn bộ bài blog (mọi trạng thái: DRAFT/PUBLISHED/ARCHIVED) cho trang quản lý — MANAGER
    @GetMapping("/manager")
    public ResponseEntity<List<BlogResponse>> getAllForManager() {
        return ResponseEntity.ok(blogService.getAllForManager());
    }

    // Tạo bài blog mới — MANAGER; tác giả lấy từ tài khoản đang đăng nhập
    @PostMapping
    public ResponseEntity<BlogResponse> createBlog(@Valid @RequestBody BlogRequest request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(blogService.createBlog(request, authentication.getName()));
    }

    // Cập nhật bài blog — MANAGER
    @PutMapping("/{id}")
    public ResponseEntity<BlogResponse> updateBlog(@PathVariable Long id, @Valid @RequestBody BlogRequest request) {
        return ResponseEntity.ok(blogService.updateBlog(id, request));
    }

    // Xoá bài blog — MANAGER
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBlog(@PathVariable Long id) {
        blogService.deleteBlog(id);
        return ResponseEntity.noContent().build();
    }
}
