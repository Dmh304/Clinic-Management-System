package com.ecms.repository;

import com.ecms.entity.Blog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BlogRepository extends JpaRepository<Blog, Long> {

    List<Blog> findByStatusOrderByPublishedAtDesc(String status);
}
