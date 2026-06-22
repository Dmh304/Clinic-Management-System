package com.ecms.service;

import com.ecms.entity.User;
import com.ecms.entity.VerificationTokenType;

public interface VerificationTokenService {

    // Tạo và lưu (hash) token xác minh email, trả về token thô (gốc) để gửi qua email
    String issueEmailVerifyToken(User user);

    // Vô hiệu hóa các token đặt lại mật khẩu cũ, tạo token mới, trả về token thô để gửi qua email
    String issuePasswordResetToken(User user);

    // Vô hiệu hóa các OTP cũ cùng loại, tạo OTP 6 số mới, trả về OTP thô để gửi qua email
    String issueOtp(User user, VerificationTokenType type);

    // Xác minh token xác minh email: hợp lệ, chưa dùng, chưa hết hạn -> đánh dấu đã dùng, trả về User
    User consumeEmailVerifyToken(String rawToken);

    // Xác minh token đặt lại mật khẩu -> đánh dấu đã dùng, trả về User
    User consumePasswordResetToken(String rawToken);

    // Xác minh OTP của một user cụ thể theo loại; sai 5 lần liên tiếp sẽ vô hiệu hóa OTP hiện tại
    void consumeOtp(User user, String rawOtp, VerificationTokenType type);
}
