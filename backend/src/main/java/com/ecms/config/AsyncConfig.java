package com.ecms.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-11
 * @updated 2026-07-11
 *
 * Enables {@code @Async} and provides a dedicated thread pool for outbound email.
 *
 * Why: Gmail SMTP can take several seconds to answer. Sending on the request
 * thread held the HTTP response open until SMTP finished, so the frontend
 * appeared to hang even though the mail went out. A separate pool lets the
 * endpoint return immediately while delivery and its status update run in the
 * background (UC-24 Deliver Invoice).
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * Thread pool backing the {@code @Async("mailExecutor")} mail workers.
     *
     * Sized small on purpose: SMTP is rate-limited upstream, so a large pool
     * would only queue against the provider. The 100-slot queue absorbs bursts
     * such as a batch of invoices being issued at closing time.
     *
     * @return the configured executor
     */
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
