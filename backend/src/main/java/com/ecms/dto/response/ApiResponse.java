// Le Thi Bich Ngan - HE204710
// Lớp bọc chuẩn cho tất cả response trả về từ các API trong hệ thống.
// Mọi endpoint đều trả về cấu trúc thống nhất gồm: trạng thái thành công/thất bại,
// thông báo, dữ liệu trả về và map lỗi theo từng field (dùng khi có nhiều lỗi validation).

package com.ecms.dto.response;

import lombok.*;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {

    // true nếu request thành công, false nếu có lỗi
    private boolean success;

    // Thông báo kết quả hoặc mô tả lỗi
    private String message;

    // Dữ liệu trả về khi thành công (null nếu thất bại)
    private T data;

    // Map lỗi theo từng field: key là tên field, value là thông báo lỗi
    // Chỉ có giá trị khi xảy ra FieldValidationException
    private Map<String, String> fieldErrors;

    // Tạo response thành công kèm thông báo và dữ liệu
    public static <T> ApiResponse<T> success(String message, T data) {
        return ApiResponse.<T>builder().success(true).message(message).data(data).build();
    }

    // Tạo response thành công chỉ với dữ liệu (không có thông báo)
    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder().success(true).data(data).build();
    }

    // Tạo response thất bại với thông báo lỗi
    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder().success(false).message(message).build();
    }
}
