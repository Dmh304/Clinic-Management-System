package com.ecms.exception;

// Dùng khi dữ liệu xung đột với bản ghi đã tồn tại (ví dụ: email đã được đăng ký) — trả về HTTP 409
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
