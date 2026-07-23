// Mạnh Hùng - HE200743
// Triển khai nghiệp vụ quản lý bài viết blog.
// Hỗ trợ lấy danh sách blog đã công bố (có thể lọc theo danh mục), truy vấn chi tiết từng bài theo ID,
// lấy danh sách danh mục blog, và CRUD bài viết cho trang quản lý (Manager).
package com.ecms.service.impl;

import com.ecms.dto.request.BlogRequest;
import com.ecms.dto.response.BlogCategoryResponse;
import com.ecms.dto.response.BlogResponse;
import com.ecms.entity.BlogCategory;
import com.ecms.entity.BlogPost;
import com.ecms.entity.User;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.BlogCategoryRepository;
import com.ecms.repository.BlogRepository;
import com.ecms.repository.UserRepository;
import com.ecms.service.BlogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class BlogServiceImpl implements BlogService {

    private static final Set<String> VALID_STATUSES = Set.of("DRAFT", "PUBLISHED", "ARCHIVED");
    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}");
    private static final Pattern NON_SLUG_CHARS = Pattern.compile("[^a-z0-9\\s-]");
    private static final Pattern WHITESPACE_OR_DASH = Pattern.compile("[\\s-]+");

    private final BlogRepository blogRepository;
    private final BlogCategoryRepository blogCategoryRepository;
    private final UserRepository userRepository;

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

    // Lấy toàn bộ bài blog (mọi trạng thái) cho trang quản lý
    @Override
    @Transactional(readOnly = true)
    public List<BlogResponse> getAllForManager() {
        return blogRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(BlogResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public BlogResponse createBlog(BlogRequest request, String authorEmail) {
        User author = userRepository.findByEmail(authorEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        BlogCategory category = resolveCategory(request.getCategoryId());
        String status = normalizeStatus(request.getStatus());

        BlogPost post = BlogPost.builder()
                .title(request.getTitle())
                .slug(generateUniqueSlug(request.getTitle()))
                .content(request.getContent())
                .thumbnailUrl(request.getThumbnailUrl())
                .author(author)
                .category(category)
                .status(status)
                .publishedAt("PUBLISHED".equals(status) ? LocalDateTime.now() : null)
                .build();

        return BlogResponse.fromEntity(blogRepository.save(post));
    }

    @Override
    @Transactional
    public BlogResponse updateBlog(Long id, BlogRequest request) {
        BlogPost post = blogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Blog not found with id: " + id));
        BlogCategory category = resolveCategory(request.getCategoryId());
        String status = normalizeStatus(request.getStatus());

        post.setTitle(request.getTitle());
        post.setContent(request.getContent());
        post.setThumbnailUrl(request.getThumbnailUrl());
        post.setCategory(category);
        post.setStatus(status);
        if ("PUBLISHED".equals(status) && post.getPublishedAt() == null) {
            post.setPublishedAt(LocalDateTime.now());
        }

        return BlogResponse.fromEntity(blogRepository.save(post));
    }

    @Override
    @Transactional
    public void deleteBlog(Long id) {
        if (!blogRepository.existsById(id)) {
            throw new ResourceNotFoundException("Blog not found with id: " + id);
        }
        blogRepository.deleteById(id);
    }

    private BlogCategory resolveCategory(Long categoryId) {
        if (categoryId == null) return null;
        return blogCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) return "DRAFT";
        String upper = status.toUpperCase();
        if (!VALID_STATUSES.contains(upper)) {
            throw new IllegalArgumentException("Trạng thái không hợp lệ: " + status);
        }
        return upper;
    }

    // Sinh slug duy nhất từ tiêu đề (bỏ dấu tiếng Việt, thay ký tự đặc biệt bằng dấu gạch ngang),
    // thêm hậu tố số nếu trùng với slug đã có
    private String generateUniqueSlug(String title) {
        String base = slugify(title);
        String slug = base;
        int counter = 2;
        while (blogRepository.existsBySlug(slug)) {
            slug = base + "-" + counter;
            counter++;
        }
        return slug;
    }

    private String slugify(String input) {
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        String noAccents = DIACRITICS.matcher(normalized).replaceAll("")
                .replace('đ', 'd').replace('Đ', 'D');
        String slug = noAccents.toLowerCase()
                .replaceAll(NON_SLUG_CHARS.pattern(), "")
                .trim();
        slug = WHITESPACE_OR_DASH.matcher(slug).replaceAll("-");
        return slug.isBlank() ? "bai-viet" : slug;
    }
}
