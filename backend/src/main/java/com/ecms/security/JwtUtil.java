// Mạnh Hùng - HE200743
// Tiện ích xử lý JWT: tạo token, trích xuất thông tin (email, role, doctorId) và kiểm tra tính hợp lệ của token.
// Sử dụng thuật toán HMAC-SHA với khóa bí mật cấu hình trong application.properties.
package com.ecms.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-token-expiration}")
    private long expiration;

    // Tạo khóa ký HMAC-SHA từ chuỗi secret được cấu hình trong application.properties
    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    // Tạo JWT chứa email (subject), role và doctorId (nếu có) với thời hạn được cấu hình sẵn
    public String generateToken(String email, String role, Long doctorId) {
        JwtBuilder builder = Jwts.builder()
                .subject(email)
                .claim("role", role)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(signingKey());

        if (doctorId != null) {
            builder.claim("doctorId", doctorId);
        }
        return builder.compact();
    }

    // Trích xuất email (subject) từ JWT
    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    // Trích xuất vai trò (role) của người dùng từ JWT
    public String extractRole(String token) {
        return parseClaims(token).get("role", String.class);
    }

    // Kiểm tra JWT có hợp lệ không (chữ ký đúng và chưa hết hạn)
    public boolean isTokenValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    // Giải mã và xác thực chữ ký JWT, trả về toàn bộ claims bên trong
    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    // Trích xuất doctorId từ JWT (chỉ có giá trị khi người dùng là bác sĩ)
    public Long extractDoctorId(String token) {
        Object doctorId = parseClaims(token).get("doctorId");
        if (doctorId == null) {
            return null;
        }
        return ((Number) doctorId).longValue();
    }
}
