// Le Thi Bich Ngan - HE204710
// Exception tùy chỉnh dùng để gom nhiều lỗi validation theo từng field cùng một lúc.
// Thay vì chỉ ném lỗi đầu tiên gặp phải, class này cho phép thu thập tất cả các field lỗi
// (ví dụ: phone trùng VÀ email trùng) rồi trả về cho client trong một response duy nhất.

package com.ecms.exception;

import java.util.Map;

public class FieldValidationException extends RuntimeException {

    // Map lưu các lỗi theo field: key là tên field (phone, email,...), value là thông báo lỗi
    private final Map<String, String> fieldErrors;

    // Khởi tạo exception với map lỗi theo từng field
    public FieldValidationException(Map<String, String> fieldErrors) {
        super("Validation failed");
        this.fieldErrors = fieldErrors;
    }

    // Trả về map lỗi để GlobalExceptionHandler đưa vào response
    public Map<String, String> getFieldErrors() {
        return fieldErrors;
    }
}
