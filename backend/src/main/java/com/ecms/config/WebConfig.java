package com.ecms.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// Phục vụ file ảnh đã upload tại /api/uploads/** -> thư mục uploads/ (cùng cấp khi chạy app).
// Đặt dưới tiền tố /api để đi qua proxy của Vite (frontend) mà không cần cấu hình thêm.
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/api/uploads/**")
                .addResourceLocations("file:uploads/");
    }
}
