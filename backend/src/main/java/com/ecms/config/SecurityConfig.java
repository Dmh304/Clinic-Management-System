package com.ecms.config;

import com.ecms.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.config.Customizer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

        private final JwtAuthFilter jwtAuthFilter;

        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }

        @Bean
        public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
                return config.getAuthenticationManager();
        }

        // @Bean
        // public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        // http
        // .cors(Customizer.withDefaults())
        // .csrf(csrf -> csrf.disable())
        // .sessionManagement(sm ->
        // sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        // // Token thiếu/sai/hết hạn → 401 (để frontend tự xoá session và chuyển về
        // // /login).
        // // Đã xác thực nhưng sai quyền (role) vẫn giữ 403 mặc định của Spring
        // Security.
        // .exceptionHandling(handling -> handling.authenticationEntryPoint(
        // (request, response, authException) -> response.sendError(
        // HttpStatus.UNAUTHORIZED.value())))
        // .authorizeHttpRequests(auth -> auth
        // // ── Auth ──────────────────────────────────────────────────────────
        // .requestMatchers(HttpMethod.POST, "/api/v1/auth/login",
        // "/api/v1/auth/register",
        // "/api/v1/auth/google",
        // "/api/v1/auth/resend-verification",
        // "/api/v1/auth/staff/login",
        // "/api/v1/auth/staff/verify-otp",
        // "/api/v1/auth/forgot-password",
        // "/api/v1/auth/reset-password")
        // .permitAll()
        // .requestMatchers(HttpMethod.GET, "/api/v1/auth/verify-email")
        // .permitAll()
        // .requestMatchers(HttpMethod.POST, "/api/v1/auth/admin/unlock-user")
        // .hasRole("ADMIN")

        @Bean
        public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
                http
                                .cors(Customizer.withDefaults())
                                .csrf(csrf -> csrf.disable())
                                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                // Token thiếu/sai/hết hạn → 401 (để frontend tự xoá session và chuyển về
                                // /login).
                                // Đã xác thực nhưng sai quyền (role) vẫn giữ 403 mặc định của Spring Security.
                                .exceptionHandling(handling -> handling
                                                .authenticationEntryPoint((request, response, authException) -> response
                                                                .sendError(HttpStatus.UNAUTHORIZED.value()))
                                                .accessDeniedHandler((request, response,
                                                                accessDeniedException) -> response.sendError(
                                                                                HttpStatus.FORBIDDEN.value())))
                                .authorizeHttpRequests(auth -> auth

                                                // ══════════════════════════════════════════════════════════════════
                                                // ── Auth (public) ─────────────────────────────────────────────────
                                                // ══════════════════════════════════════════════════════════════════
                                                .requestMatchers(HttpMethod.POST,
                                                                "/api/v1/auth/login",
                                                                "/api/v1/auth/register",
                                                                "/api/v1/auth/google",
                                                                "/api/v1/auth/resend-verification",
                                                                "/api/v1/auth/staff/login",
                                                                "/api/v1/auth/staff/verify-otp",
                                                                "/api/v1/auth/demo/login",
                                                                "/api/v1/auth/forgot-password",
                                                                "/api/v1/auth/reset-password")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/v1/auth/verify-email")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.POST, "/api/v1/auth/admin/unlock-user")
                                                .hasRole("ADMIN")

                                                // ── Swagger / Docs ─────────────────────────────────────────────
                                                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**",
                                                                "/swagger-ui.html")
                                                .permitAll()
                                                // ── Swagger / Docs (public) ────────────────────────────────────
                                                .requestMatchers(
                                                                "/v3/api-docs/**",
                                                                "/swagger-ui/**",
                                                                "/swagger-ui.html")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/v1/auth/verify-email")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.POST, "/api/v1/auth/admin/unlock-user")
                                                .hasRole("ADMIN")
                                                .requestMatchers("/ws/**")
                                                .permitAll()

                                                // ══════════════════════════════════════════════════════════════════
                                                // ── Payments: webhook cổng thanh toán (UC-22) — ThangNBHE201024 ───
                                                // ══════════════════════════════════════════════════════════════════
                                                // Cổng thanh toán (SePay) gọi từ server của họ nên không có JWT của ECMS.
                                                // Endpoint này buộc phải permitAll để qua được filter chain; việc xác thực
                                                // do PaymentService đảm nhiệm bằng API key dùng chung:
                                                // header Authorization: Apikey <payment.webhook.api-key>.
                                                // Chưa cấu hình key thì mọi webhook đều bị từ chối.
                                                .requestMatchers(HttpMethod.POST, "/api/v1/payments/webhook")
                                                .permitAll()
                                                // Tra cứu trạng thái thanh toán vẫn yêu cầu đăng nhập như mọi API khác
                                                .requestMatchers(HttpMethod.GET, "/api/v1/payments/invoice/*/status")
                                                .hasAnyRole("ADMIN", "RECEPTIONIST", "MANAGER", "PATIENT")
                                                // Đối soát giao dịch + xác nhận hoàn tiền: chỉ nhân viên thu ngân
                                                // và quản lý. KHÔNG để rơi xuống anyRequest().authenticated(),
                                                // vì khi đó bệnh nhân cũng xem được toàn bộ giao dịch của người khác
                                                // và tự xác nhận đã hoàn tiền.
                                                .requestMatchers("/api/v1/payments/reconciliation",
                                                                "/api/v1/payments/transactions/**")
                                                .hasAnyRole("ADMIN", "RECEPTIONIST", "MANAGER")

                                                // ══════════════════════════════════════════════════════════════════
                                                // ── Doctors: GET list public ───────────────────────────────────────
                                                // ══════════════════════════════════════════════════════════════════
                                                .requestMatchers(HttpMethod.GET, "/api/v1/doctors")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/v1/doctors/*")
                                                .permitAll()

                                                // ══════════════════════════════════════════════════════════════════
                                                // ── Users: link hủy đăng ký email khuyến mãi — public ─────────────
                                                // ══════════════════════════════════════════════════════════════════
                                                .requestMatchers(HttpMethod.GET, "/api/v1/users/unsubscribe")
                                                .permitAll()

                                                // ══════════════════════════════════════════════════════════════════
                                                // ── Services ──────────────────────────────────────────────────────
                                                // ══════════════════════════════════════════════════════════════════
                                                // Specific routes FIRST
                                                .requestMatchers(HttpMethod.GET,
                                                                "/api/v1/services",
                                                                "/api/v1/services/categories",
                                                                "/api/v1/services/{id:[0-9]+}")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/v1/services/my-registrations")
                                                .hasRole("PATIENT")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/services/registrations")
                                                .hasAnyRole("RECEPTIONIST", "ADMIN")
                                                .requestMatchers(HttpMethod.POST, "/api/v1/services/register")
                                                .hasAnyRole("PATIENT", "RECEPTIONIST")
                                                .requestMatchers(HttpMethod.POST, "/api/v1/services/register-and-book")
                                                .hasRole("PATIENT")
                                                // ── Ảnh đã upload: cho phép xem công khai ───────────────────────
                                                .requestMatchers(HttpMethod.GET, "/api/uploads/**")
                                                .permitAll()
                                                // Upload ảnh: chỉ MANAGER/ADMIN
                                                .requestMatchers(HttpMethod.POST, "/api/v1/files/upload")
                                                .hasAnyRole("MANAGER", "ADMIN")

                                                // ── Available slots ────────────────────────────────────────────
                                                // MANAGER cần xem khung giờ trống khi chuyển lịch hẹn (reassign)
                                                .requestMatchers(HttpMethod.GET, "/api/v1/appointments/available-slots")
                                                .hasAnyRole("PATIENT", "ADMIN", "RECEPTIONIST", "DOCTOR", "MANAGER")
                                                .requestMatchers(HttpMethod.POST, "/api/v1/appointments/book")
                                                .hasAnyRole("PATIENT", "ADMIN", "RECEPTIONIST")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/appointments/my")
                                                .hasRole("PATIENT")
                                                .requestMatchers("/api/v1/emr/all").hasAnyRole("DOCTOR", "ADMIN")
                                                .requestMatchers("/api/v1/emr/history").hasRole("PATIENT")

                                                // ── EMR ────────────────────────────────────────────────────────
                                                .requestMatchers(HttpMethod.POST, "/api/v1/emr").hasRole("DOCTOR")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/emr/appointment/*")
                                                .hasAnyRole("DOCTOR", "RECEPTIONIST", "ADMIN")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/emr/patient/*/history")
                                                .hasAnyRole("DOCTOR", "PATIENT", "ADMIN")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/emr/*")
                                                .hasAnyRole("DOCTOR", "PATIENT", "ADMIN")

                                                // ── Prescriptions ──────────────────────────────────────────────
                                                .requestMatchers(HttpMethod.POST, "/api/v1/prescriptions",
                                                                "/api/v1/eyeglass-prescriptions")
                                                .hasRole("DOCTOR")
                                                .requestMatchers(HttpMethod.PATCH, "/api/v1/prescriptions/*/dispense",
                                                                "/api/v1/prescriptions/*/skip")
                                                .hasRole("PHARMACIST")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/prescriptions/pending", "/api/v1/prescriptions/all")
                                                .hasRole("PHARMACIST")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/prescriptions/patient/*",
                                                                "/api/v1/eyeglass-prescriptions/patient/*")
                                                .hasAnyRole("PATIENT", "DOCTOR", "PHARMACIST", "ADMIN")
                                                // ── Services: GET public, POST/registrations restricted ─────────
                                                .requestMatchers(HttpMethod.GET, "/api/v1/services",
                                                                "/api/v1/services/categories",
                                                                "/api/v1/services/{id:[0-9]+}")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.POST, "/api/v1/services/register")
                                                .hasAnyRole("PATIENT", "RECEPTIONIST")
                                                .requestMatchers(HttpMethod.POST, "/api/v1/services/register-and-book")
                                                .hasRole("PATIENT")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/services/registrations")
                                                .hasAnyRole("RECEPTIONIST", "ADMIN")
                                                .requestMatchers(HttpMethod.PATCH, "/api/v1/services/registrations/**")
                                                .hasAnyRole("RECEPTIONIST", "ADMIN")
                                                .requestMatchers(HttpMethod.POST, "/api/v1/services/registrations/**")
                                                .hasAnyRole("RECEPTIONIST", "ADMIN")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/services/my-registrations")
                                                .hasRole("PATIENT")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/services/packages")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers(HttpMethod.POST, "/api/v1/services/packages")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers(HttpMethod.PUT, "/api/v1/services/packages/**")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers(HttpMethod.PATCH, "/api/v1/services/packages/**")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers(HttpMethod.DELETE, "/api/v1/services/packages/**")
                                                .hasAnyRole("MANAGER", "ADMIN")

                                                // ══════════════════════════════════════════════════════════════════
                                                // ── Blogs ─────────────────────────────────────────────────────────
                                                // ══════════════════════════════════════════════════════════════════
                                                // Manager routes FIRST (more specific), public GET routes after
                                                .requestMatchers(HttpMethod.GET, "/api/v1/blogs/manager")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/blogs",
                                                                "/api/v1/blogs/categories",
                                                                "/api/v1/blogs/{id:[0-9]+}")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.POST, "/api/v1/blogs")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers(HttpMethod.PUT, "/api/v1/blogs/**")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers(HttpMethod.DELETE, "/api/v1/blogs/**")
                                                .hasAnyRole("MANAGER", "ADMIN")

                                                // ══════════════════════════════════════════════════════════════════
                                                // ── Appointments ──────────────────────────────────────────────────
                                                // ══════════════════════════════════════════════════════════════════
                                                // Specific routes FIRST, wildcard LAST
                                                .requestMatchers(HttpMethod.GET, "/api/v1/appointments/my")
                                                .hasRole("PATIENT")
                                                .requestMatchers(HttpMethod.POST, "/api/v1/appointments/book")
                                                .hasAnyRole("PATIENT", "ADMIN", "RECEPTIONIST")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/appointments/daily-schedule")
                                                .hasAnyRole("ADMIN", "DOCTOR", "RECEPTIONIST", "MANAGER")
                                                // RECEPTIONIST được thêm vào đây: lễ tân là đầu mối đổi lịch
                                                // (đổi giờ/bác sĩ) khi khách đã tới quầy — không chỉ MANAGER.
                                                .requestMatchers(HttpMethod.PATCH, "/api/v1/appointments/*/reassign")
                                                .hasAnyRole("MANAGER", "ADMIN", "RECEPTIONIST")
                                                .requestMatchers(HttpMethod.PATCH, "/api/v1/appointments/*/cancel")
                                                .hasAnyRole("PATIENT", "RECEPTIONIST", "ADMIN", "MANAGER")
                                                .requestMatchers(HttpMethod.PATCH, "/api/v1/appointments/*/reschedule")
                                                .hasAnyRole("PATIENT", "RECEPTIONIST", "ADMIN", "MANAGER")
                                                .requestMatchers(HttpMethod.PATCH, "/api/v1/appointments/*/notes")
                                                .hasAnyRole("RECEPTIONIST", "ADMIN", "MANAGER")
                                                // Wildcard: covers all other /appointments/** (no PATIENT here)
                                                .requestMatchers("/api/v1/appointments/**")
                                                .hasAnyRole("ADMIN", "DOCTOR", "RECEPTIONIST", "MANAGER")

                                                // ══════════════════════════════════════════════════════════════════
                                                // ── EMR ───────────────────────────────────────────────────────────
                                                // ══════════════════════════════════════════════════════════════════
                                                // Specific routes FIRST, wildcard LAST
                                                .requestMatchers(HttpMethod.GET, "/api/v1/emr/history")
                                                .hasRole("PATIENT")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/emr/all")
                                                .hasAnyRole("DOCTOR", "ADMIN")
                                                // Wildcard: covers /emr/{id}, /emr/appointment/{id}, etc.
                                                .requestMatchers(HttpMethod.GET, "/api/v1/emr/{id}")
                                                .hasAnyRole("ADMIN", "DOCTOR", "PATIENT") // ← thêm PATIENT
                                                .requestMatchers("/api/v1/emr/**")
                                                .hasAnyRole("ADMIN", "DOCTOR")
                                                // ══════════════════════════════════════════════════════════════════
                                                // ── EMR ───────────────────────────────────────────────────────────
                                                // ══════════════════════════════════════════════════════════════════
                                                .requestMatchers(HttpMethod.GET, "/api/v1/emr/test-all")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/v1/emr/history")
                                                .hasRole("PATIENT")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/emr/all")
                                                .hasAnyRole("DOCTOR", "ADMIN")
                                                // Wildcard: covers /emr/{id}, /emr/appointment/{id}, etc.
                                                .requestMatchers(HttpMethod.GET, "/api/v1/emr/{id}")
                                                .hasAnyRole("ADMIN", "DOCTOR", "PATIENT") // ← thêm PATIENT
                                                .requestMatchers("/api/v1/emr/**")
                                                .hasAnyRole("ADMIN", "DOCTOR")

                                                // ══════════════════════════════════════════════════════════════════
                                                // ── Patients ──────────────────────────────────────────────────────
                                                // ══════════════════════════════════════════════════════════════════
                                                .requestMatchers("/api/v1/patients/**")
                                                .hasAnyRole("ADMIN", "DOCTOR", "RECEPTIONIST", "MANAGER")

                                                // ══════════════════════════════════════════════════════════════════
                                                // ── Discount Campaigns ────────────────────────────────────────────
                                                // ══════════════════════════════════════════════════════════════════
                                                // /active + /{id} công khai để trang khuyến mãi cho khách xem
                                                // (không cho đăng nhập) — /quote vẫn rơi vào rule hasAnyRole bên
                                                // dưới vì "quote" không khớp pattern số {id:[0-9]+}.
                                                .requestMatchers(HttpMethod.GET, "/api/v1/discount-campaigns/active",
                                                                "/api/v1/discount-campaigns/public",
                                                                "/api/v1/discount-campaigns/{id:[0-9]+}")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/v1/discount-campaigns/**")
                                                .hasAnyRole("MANAGER", "RECEPTIONIST", "ADMIN")
                                                .requestMatchers(HttpMethod.POST, "/api/v1/discount-campaigns")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers(HttpMethod.POST, "/api/v1/discount-campaigns/*/broadcast")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers(HttpMethod.PUT, "/api/v1/discount-campaigns/**")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers(HttpMethod.DELETE, "/api/v1/discount-campaigns/**")
                                                .hasAnyRole("MANAGER", "ADMIN")

                                                // ══════════════════════════════════════════════════════════════════
                                                // ── Rooms (UC-58) & Room Roster (UC-59) ───────────────────────────
                                                // ══════════════════════════════════════════════════════════════════
                                                .requestMatchers(HttpMethod.GET, "/api/v1/rooms/by-type/**",
                                                                "/api/v1/rooms/by-service/**")
                                                .hasAnyRole("MANAGER", "RECEPTIONIST", "ADMIN")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/rooms/**")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers(HttpMethod.POST, "/api/v1/rooms")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers(HttpMethod.PUT, "/api/v1/rooms/**")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers(HttpMethod.DELETE, "/api/v1/rooms/**")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers("/api/v1/room-roster/**")
                                                .hasAnyRole("MANAGER", "ADMIN")

                                                // ══════════════════════════════════════════════════════════════════
                                                // ── Subscriptions ─────────────────────────────────────────────────
                                                // ══════════════════════════════════════════════════════════════════
                                                // Specific routes FIRST, wildcard LAST
                                                .requestMatchers(HttpMethod.GET, "/api/v1/subscriptions/my")
                                                .hasRole("PATIENT")
                                                .requestMatchers(HttpMethod.GET,
                                                                "/api/v1/subscriptions/validate-discount")
                                                .hasAnyRole("PATIENT", "RECEPTIONIST")
                                                .requestMatchers(HttpMethod.POST, "/api/v1/subscriptions")
                                                .hasAnyRole("PATIENT", "RECEPTIONIST", "MANAGER")
                                                .requestMatchers("/api/v1/subscriptions/**")
                                                .hasAnyRole("RECEPTIONIST", "MANAGER", "ADMIN", "PATIENT")

                                                // ── Care sessions ─────────────────────────────────────────────
                                                .requestMatchers(HttpMethod.POST, "/api/v1/care-sessions")
                                                .hasAnyRole("PATIENT", "RECEPTIONIST")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/care-sessions/my")
                                                .hasRole("PATIENT")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/care-sessions/queue")
                                                .hasRole("NURSE")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/care-sessions/nurses")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers(HttpMethod.POST, "/api/v1/care-sessions")
                                                .hasRole("PATIENT")
                                                .requestMatchers(HttpMethod.PATCH, "/api/v1/care-sessions/*/check-in")
                                                .hasAnyRole("RECEPTIONIST", "MANAGER", "ADMIN")
                                                .requestMatchers(HttpMethod.PATCH, "/api/v1/care-sessions/*/start")
                                                .hasRole("NURSE")
                                                .requestMatchers(HttpMethod.PATCH, "/api/v1/care-sessions/*/complete")
                                                .hasRole("NURSE")
                                                .requestMatchers(HttpMethod.PATCH,
                                                                "/api/v1/care-sessions/*/assign-nurse")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers(HttpMethod.POST, "/api/v1/care-sessions/auto-assign")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers(HttpMethod.PATCH, "/api/v1/care-sessions/*/checkout")
                                                .hasAnyRole("RECEPTIONIST", "MANAGER", "ADMIN")
                                                // Wildcard
                                                .requestMatchers("/api/v1/care-sessions/**")
                                                .hasAnyRole("RECEPTIONIST", "MANAGER", "ADMIN", "NURSE", "PATIENT")
                                                // ══════════════════════════════════════════════════════════════════
                                                // ── Lab Orders ────────────────────────────────────────────────────
                                                // ══════════════════════════════════════════════════════════════════
                                                .requestMatchers(HttpMethod.GET, "/api/v1/lab/technicians")
                                                .hasAnyRole("DOCTOR", "ADMIN", "MANAGER")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/lab/queue")
                                                .hasAnyRole("LAB_TECHNICIAN", "ADMIN")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/lab/emr/*/patient")
                                                .hasAnyRole("PATIENT", "ADMIN")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/lab/emr/**")
                                                .hasAnyRole("DOCTOR", "ADMIN")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/lab/*/results")
                                                .hasAnyRole("DOCTOR", "LAB_TECHNICIAN", "PATIENT")
                                                .requestMatchers(HttpMethod.POST, "/api/v1/lab")
                                                .hasAnyRole("DOCTOR", "ADMIN")
                                                .requestMatchers(HttpMethod.PUT, "/api/v1/lab/*/start")
                                                .hasAnyRole("LAB_TECHNICIAN", "ADMIN")
                                                .requestMatchers(HttpMethod.PUT, "/api/v1/lab/*/result")
                                                .hasAnyRole("LAB_TECHNICIAN", "ADMIN")
                                                .requestMatchers(HttpMethod.PUT, "/api/v1/lab/*/approve")
                                                .hasAnyRole("DOCTOR", "ADMIN")
                                                .requestMatchers(HttpMethod.PUT, "/api/v1/lab/*/retest")
                                                .hasAnyRole("DOCTOR", "ADMIN")
                                                .requestMatchers(HttpMethod.GET, "/api/v1/lab/doctor")
                                                .hasAnyRole("DOCTOR", "ADMIN")
                                                .requestMatchers(HttpMethod.PUT, "/api/v1/lab/*/draft")
                                                .hasAnyRole("LAB_TECHNICIAN", "ADMIN")
                                                // ══════════════════════════════════════════════════════════════════
                                                // ── Everything else requires authentication ────────────────────────
                                                // ══════════════════════════════════════════════════════════════════

                                                // ── Doctors list: public ───────────────────────────────────────
                                                .requestMatchers(HttpMethod.GET, "/api/v1/doctors")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/v1/doctors/*")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.PATCH, "/api/v1/doctors/*/avatar")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers(HttpMethod.PATCH, "/api/v1/doctors/*/featured")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers(HttpMethod.PATCH, "/api/v1/doctors/*")
                                                .hasAnyRole("MANAGER", "ADMIN")

                                                // (Appointments: đã gộp toàn bộ rule vào khối duy nhất phía trên —
                                                // trước đây có 1 bản sao y hệt ở đây khiến các rule wildcard
                                                // "/appointments/**" đứng TRƯỚC che mất rule /cancel /reschedule
                                                // của PATIENT trong khối phía trên, vì Spring Security khớp theo
                                                // đúng thứ tự khai báo — matcher nào khớp trước dùng luôn rule đó.)

                                                // ── Patients ───────────────────────────────────────────────────
                                                .requestMatchers("/api/v1/patients/**")
                                                .hasAnyRole("ADMIN", "DOCTOR", "RECEPTIONIST", "MANAGER")

                                                // ── Notifications (UC-13) ──────────────────────────────────────
                                                // Chuông thông báo hiển thị cho mọi người dùng đã đăng nhập;
                                                // vai trò nhận thông báo được suy ra server-side từ tài khoản.
                                                .requestMatchers("/api/v1/notifications/**")
                                                .authenticated()
                                                // ── Admin: audit log (UC-57) ────────────────────────────────────
                                                .requestMatchers("/api/v1/feedbacks/**")
                                                .hasRole("PATIENT")
                                                .requestMatchers("/api/v1/reports/**")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                // BR-17 (Payroll Authority): CHỈ Clinic Manager được
                                                // duyệt bảng lương. Rule này phải đứng TRƯỚC rule
                                                // /payroll/** bên dưới, nếu không ADMIN vẫn lọt qua —
                                                // Spring Security lấy matcher khớp đầu tiên.
                                                .requestMatchers(HttpMethod.POST, "/api/v1/payroll/periods/*/approve")
                                                .hasRole("MANAGER")
                                                // Xem/soạn nháp thì ADMIN vẫn được (không cam kết chi tiền).
                                                .requestMatchers("/api/v1/payroll/**")
                                                .hasAnyRole("MANAGER", "ADMIN")
                                                .requestMatchers("/api/v1/admin/**")
                                                .hasRole("ADMIN")

                                                // ── Xưởng kính: các thao tác nghiệp vụ chỉ dành cho nhân viên ──
                                                // Trước đây EyeglassOrderServiceImpl.dispenseOrder() tra bảng staffs
                                                // và ném lỗi nếu không thấy — vô tình đóng vai trò chốt chặn quyền.
                                                // Từ khi dispensed_by trỏ users(id) thì phép tra đó bị bỏ, nên phải
                                                // khai báo quyền TƯỜNG MINH ở đây (project chưa bật @EnableMethodSecurity
                                                // nên @PreAuthorize trên controller sẽ KHÔNG có tác dụng).
                                                // Lưu ý: đường dẫn là /api/eyeglass-orders (không có /v1).
                                                .requestMatchers(
                                                                "/api/eyeglass-orders/*/pickup",
                                                                "/api/eyeglass-orders/*/confirm",
                                                                "/api/eyeglass-orders/*/cancel",
                                                                "/api/eyeglass-orders/pending")
                                                .hasAnyRole("RECEPTIONIST", "PHARMACIST", "LAB_TECHNICIAN", "MANAGER", "ADMIN")

                                                // ── Everything else requires authentication ────────────────────
                                                .anyRequest().authenticated());

                http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
                return http.build();
        }
}