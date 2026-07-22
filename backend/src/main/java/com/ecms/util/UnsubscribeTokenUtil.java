// Sinh + xác thực token cho link "Hủy đăng ký nhận email khuyến mãi" trong email broadcast.
// Stateless (không lưu DB) vì link phải luôn còn hiệu lực — dùng HMAC-SHA256 với cùng khóa bí
// mật đã cấu hình cho JWT (jwt.secret), tách biệt khỏi cơ chế verification_tokens (vốn có
// expires_at bắt buộc, không phù hợp cho link cần tồn tại vô thời hạn).
package com.ecms.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@Component
public class UnsubscribeTokenUtil {

    private static final String HMAC_ALGO = "HmacSHA256";

    @Value("${jwt.secret}")
    private String secret;

    public String generateToken(Long userId) {
        return hmac(userId);
    }

    public boolean verifyToken(Long userId, String token) {
        if (userId == null || token == null) return false;
        String expected = hmac(userId);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                token.getBytes(StandardCharsets.UTF_8));
    }

    private String hmac(Long userId) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGO));
            byte[] digest = mac.doFinal(("unsubscribe:" + userId).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("Không thể tạo token hủy đăng ký", e);
        }
    }
}
