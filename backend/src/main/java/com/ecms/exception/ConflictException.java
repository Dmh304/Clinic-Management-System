package com.ecms.exception;

// Lỗi xung đột nghiệp vụ (HTTP 409): tài nguyên đã tồn tại / trùng lặp,
// ví dụ bệnh nhân đăng ký lại dịch vụ khi đã có đăng ký đang chờ tư vấn.
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
