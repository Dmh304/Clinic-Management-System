package com.ecms.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Bật xử lý bất đồng bộ (@Async) và cấu hình thread pool riêng cho việc gửi email.
 *
 * Lý do: SMTP (Gmail) có thể phản hồi chậm vài giây. Nếu gửi ngay trên thread
 * request thì HTTP response bị treo tới khi SMTP xong -> phía frontend báo
 * "không nhận response" dù email vẫn được gửi. Đẩy việc gửi sang pool riêng
 * giúp endpoint trả về ngay, còn email chạy nền và cập nhật tình trạng gửi.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "mailExecutor")
    public Executor mailExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("mail-");
        executor.initialize();
        return executor;
    }
}
