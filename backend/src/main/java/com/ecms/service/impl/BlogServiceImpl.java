package com.ecms.service.impl;

import com.ecms.dto.response.BlogResponse;
import com.ecms.entity.Blog;
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

    @Override
    public List<BlogResponse> getAllPublishedBlogs() {
        return blogRepository.findByStatusOrderByPublishedAtDesc("PUBLISHED")
                .stream()
                .map(BlogResponse::fromEntity)
                .toList();
    }

    @Override
    public BlogResponse getBlogById(Long id) {
        Blog blog = blogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Blog not found with id: " + id));
        return BlogResponse.fromEntity(blog);
    }
}
