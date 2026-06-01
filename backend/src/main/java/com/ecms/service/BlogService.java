package com.ecms.service;

import com.ecms.dto.response.BlogResponse;

import java.util.List;

public interface BlogService {

    List<BlogResponse> getAllPublishedBlogs();

    BlogResponse getBlogById(Long id);
}
