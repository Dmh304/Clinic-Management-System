// Mạnh Hùng - HE200743
// Controller cung cấp API quản lý bài viết blog của phòng khám.
// Hỗ trợ lấy danh sách tất cả bài đã đăng và xem chi tiết từng bài theo ID.
package com.ecms.controller;

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
    @GetMapping
    public ResponseEntity<List<BlogResponse>> getAllBlogs() {
        return ResponseEntity.ok(blogService.getAllPublishedBlogs());
    }

    // Lấy chi tiết một bài blog theo ID; trả về 404 nếu không tìm thấy
    @GetMapping("/{id}")
    public ResponseEntity<BlogResponse> getBlogById(@PathVariable Long id) {
        return ResponseEntity.ok(blogService.getBlogById(id));
    }
}
