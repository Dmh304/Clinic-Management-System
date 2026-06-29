package com.ecms.config;

import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class CorsConfig {
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // Dùng allowedOriginPatterns (hỗ trợ wildcard) để cho phép truy cập
        // từ IP LAN khi test trên nhiều máy cùng mạng, không chỉ localhost.
        config.setAllowedOriginPatterns(List.of(
                "http://localhost:5173", "http://localhost:5174",
                "http://192.168.*.*:5173", "http://192.168.*.*:5174",
                "http://10.*.*.*:5173", "http://10.*.*.*:5174"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
