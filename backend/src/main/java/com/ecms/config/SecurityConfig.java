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

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Token thiếu/sai/hết hạn → 401 (để frontend tự xoá session và chuyển về /login).
                // Đã xác thực nhưng sai quyền (role) vẫn giữ 403 mặc định của Spring Security.
                .exceptionHandling(handling -> handling.authenticationEntryPoint(
                        (request, response, authException) -> response.sendError(HttpStatus.UNAUTHORIZED.value())))
                .authorizeHttpRequests(auth -> auth
                        // ── Auth ──────────────────────────────────────────────────────────
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/login", "/api/v1/auth/register",
                                "/api/v1/auth/google", "/api/v1/auth/resend-verification",
                                "/api/v1/auth/staff/login", "/api/v1/auth/staff/verify-otp",
                                "/api/v1/auth/forgot-password", "/api/v1/auth/reset-password")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/auth/verify-email")
                        .permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/admin/unlock-user")
                        .hasRole("ADMIN")

                        // ── Swagger / Docs ─────────────────────────────────────────────
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html")
                        .permitAll()

                        // ── Services: GET public, POST/registrations restricted ─────────
                        .requestMatchers(HttpMethod.GET, "/api/v1/services", "/api/v1/services/categories", "/api/v1/services/{id:[0-9]+}")
                        .permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/services/register")
                        .hasAnyRole("PATIENT", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.GET, "/api/v1/services/registrations")
                        .hasAnyRole("RECEPTIONIST", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/services/my-registrations")
                        .hasRole("PATIENT")
                        .requestMatchers(HttpMethod.POST, "/api/v1/services/packages")
                        .hasAnyRole("MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/services/packages/**")
                        .hasAnyRole("MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/services/packages/**")
                        .hasAnyRole("MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/services/packages/**")
                        .hasAnyRole("MANAGER", "ADMIN")

                        // ── Discount campaigns ─────────────────────────────────────────
                        .requestMatchers(HttpMethod.GET, "/api/v1/discount-campaigns/active")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/discount-campaigns/**")
                        .hasAnyRole("MANAGER", "RECEPTIONIST", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/discount-campaigns")
                        .hasAnyRole("MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/discount-campaigns/**")
                        .hasAnyRole("MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/discount-campaigns/**")
                        .hasAnyRole("MANAGER", "ADMIN")

                        // ── Subscriptions ─────────────────────────────────────────────
                        .requestMatchers(HttpMethod.POST, "/api/v1/subscriptions")
                        .hasAnyRole("PATIENT", "RECEPTIONIST", "MANAGER")
                        .requestMatchers(HttpMethod.GET, "/api/v1/subscriptions/my")
                        .hasRole("PATIENT")
                        .requestMatchers(HttpMethod.GET, "/api/v1/subscriptions/validate-discount")
                        .hasAnyRole("PATIENT", "RECEPTIONIST")
                        .requestMatchers("/api/v1/subscriptions/**")
                        .hasAnyRole("RECEPTIONIST", "MANAGER", "ADMIN", "PATIENT")

                        // ── Care sessions ─────────────────────────────────────────────
                        .requestMatchers(HttpMethod.POST, "/api/v1/care-sessions")
                        .hasRole("PATIENT")
                        .requestMatchers(HttpMethod.GET, "/api/v1/care-sessions/my")
                        .hasRole("PATIENT")
                        .requestMatchers(HttpMethod.GET, "/api/v1/care-sessions/queue")
                        .hasRole("NURSE")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/care-sessions/*/start")
                        .hasRole("NURSE")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/care-sessions/*/complete")
                        .hasRole("NURSE")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/care-sessions/*/assign-nurse")
                        .hasAnyRole("MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/care-sessions/*/checkout")
                        .hasAnyRole("RECEPTIONIST", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/care-sessions/nurses")
                        .hasAnyRole("MANAGER", "ADMIN")
                        .requestMatchers("/api/v1/care-sessions/**")
                        .hasAnyRole("RECEPTIONIST", "MANAGER", "ADMIN", "NURSE", "PATIENT")

                        // ── Doctors list: public ───────────────────────────────────────
                        .requestMatchers(HttpMethod.GET, "/api/v1/doctors")
                        .permitAll()

                        // ── Appointments ───────────────────────────────────────────────
                        .requestMatchers(HttpMethod.GET, "/api/v1/appointments/daily-schedule")
                        .hasAnyRole("ADMIN", "DOCTOR", "RECEPTIONIST", "MANAGER")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/appointments/*/reassign")
                        .hasAnyRole("MANAGER", "ADMIN")
                        .requestMatchers("/api/v1/appointments/**")
                        .hasAnyRole("ADMIN", "DOCTOR", "RECEPTIONIST", "MANAGER")

                        // ── Patients ───────────────────────────────────────────────────
                        .requestMatchers("/api/v1/patients/**")
                        .hasAnyRole("ADMIN", "DOCTOR", "RECEPTIONIST", "MANAGER")

                        // ── Admin: audit log (UC-57) ────────────────────────────────────
                        .requestMatchers("/api/v1/admin/**")
                        .hasRole("ADMIN")

                        // ── Everything else requires authentication ────────────────────
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
