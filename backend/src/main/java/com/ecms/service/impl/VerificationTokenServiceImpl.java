package com.ecms.service.impl;

import com.ecms.entity.User;
import com.ecms.entity.VerificationToken;
import com.ecms.entity.VerificationTokenType;
import com.ecms.exception.UnauthorizedException;
import com.ecms.repository.VerificationTokenRepository;
import com.ecms.service.VerificationTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
public class VerificationTokenServiceImpl implements VerificationTokenService {

    private static final int MAX_OTP_ATTEMPTS = 5;

    private final VerificationTokenRepository tokenRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    // Theo dõi số lần nhập sai OTP trong phiên hiện tại (không lưu DB vì bảng verification_tokens không có cột này)
    private final ConcurrentHashMap<String, AtomicInteger> otpAttempts = new ConcurrentHashMap<>();

    @Override
    @Transactional
    public String issueEmailVerifyToken(User user) {
        tokenRepository.invalidateActiveTokens(user.getId(), VerificationTokenType.EMAIL_VERIFY);
        String rawToken = generateRawToken();
        saveToken(user, rawToken, VerificationTokenType.EMAIL_VERIFY, LocalDateTime.now().plusHours(24));
        return rawToken;
    }

    @Override
    @Transactional
    public String issuePasswordResetToken(User user) {
        tokenRepository.invalidateActiveTokens(user.getId(), VerificationTokenType.PASSWORD_RESET);
        String rawToken = generateRawToken();
        saveToken(user, rawToken, VerificationTokenType.PASSWORD_RESET, LocalDateTime.now().plusMinutes(15));
        return rawToken;
    }

    @Override
    @Transactional
    public String issueOtp(User user, VerificationTokenType type) {
        tokenRepository.invalidateActiveTokens(user.getId(), type);
        otpAttempts.remove(attemptKey(user.getId(), type));
        String rawOtp = generateOtp();
        saveToken(user, rawOtp, type, LocalDateTime.now().plusMinutes(5));
        return rawOtp;
    }

    @Override
    @Transactional
    public User consumeEmailVerifyToken(String rawToken) {
        VerificationToken token = findValid(rawToken, VerificationTokenType.EMAIL_VERIFY);
        token.setUsed(true);
        tokenRepository.save(token);
        return token.getUser();
    }

    @Override
    @Transactional
    public User consumePasswordResetToken(String rawToken) {
        VerificationToken token = findValid(rawToken, VerificationTokenType.PASSWORD_RESET);
        token.setUsed(true);
        tokenRepository.save(token);
        return token.getUser();
    }

    @Override
    @Transactional
    public void consumeOtp(User user, String rawOtp, VerificationTokenType type) {
        String key = attemptKey(user.getId(), type);
        List<VerificationToken> active = tokenRepository.findByUser_IdAndTypeAndUsedFalse(user.getId(), type);

        VerificationToken latest = active.stream()
                .filter(t -> t.getExpiresAt().isAfter(LocalDateTime.now()))
                .max(Comparator.comparing(VerificationToken::getCreatedAt))
                .orElseThrow(() -> new IllegalArgumentException("Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới"));

        if (!latest.getTokenHash().equals(hash(rawOtp))) {
            int attempts = otpAttempts.computeIfAbsent(key, k -> new AtomicInteger(0)).incrementAndGet();
            if (attempts >= MAX_OTP_ATTEMPTS) {
                tokenRepository.invalidateActiveTokens(user.getId(), type);
                otpAttempts.remove(key);
                throw new UnauthorizedException("Bạn đã nhập sai mã OTP quá nhiều lần. Vui lòng đăng nhập lại");
            }
            throw new IllegalArgumentException("Mã OTP không đúng");
        }

        latest.setUsed(true);
        tokenRepository.save(latest);
        otpAttempts.remove(key);
    }

    private VerificationToken findValid(String rawToken, VerificationTokenType type) {
        VerificationToken token = tokenRepository.findByTokenHashAndType(hash(rawToken), type)
                .orElseThrow(() -> new IllegalArgumentException("Liên kết không hợp lệ hoặc đã được sử dụng"));

        if (token.isUsed() || token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Liên kết đã hết hạn hoặc đã được sử dụng");
        }
        return token;
    }

    private void saveToken(User user, String rawValue, VerificationTokenType type, LocalDateTime expiresAt) {
        VerificationToken token = VerificationToken.builder()
                .user(user)
                .tokenHash(hash(rawValue))
                .type(type)
                .expiresAt(expiresAt)
                .used(false)
                .build();
        tokenRepository.save(token);
    }

    private String attemptKey(Long userId, VerificationTokenType type) {
        return userId + ":" + type;
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private String generateOtp() {
        int code = secureRandom.nextInt(1_000_000);
        return String.format("%06d", code);
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Lỗi mã hóa token", e);
        }
    }
}
