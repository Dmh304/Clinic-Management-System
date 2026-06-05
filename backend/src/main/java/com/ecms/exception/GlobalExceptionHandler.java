// Le Thi Bich Ngan - HE204710
// Xử lý tập trung tất cả các exception phát sinh trong toàn bộ ứng dụng.
// Bắt các loại lỗi khác nhau và chuyển đổi thành response JSON thống nhất (ApiResponse)
// với mã HTTP phù hợp, giúp frontend nhận được thông báo lỗi rõ ràng và nhất quán.

package com.ecms.exception;

import com.ecms.dto.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // Xử lý khi không tìm thấy tài nguyên trong hệ thống (ví dụ: bệnh nhân, bác sĩ không tồn tại)
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ex.getMessage()));
    }

    // Xử lý lỗi validation nhiều field cùng lúc (phone trùng, email trùng,...).
    // Trả về map fieldErrors để frontend hiển thị lỗi đúng vị trí từng field.
    @ExceptionHandler(FieldValidationException.class)
    public ResponseEntity<ApiResponse<Void>> handleFieldValidation(FieldValidationException ex) {
        return ResponseEntity.badRequest()
                .body(ApiResponse.<Void>builder()
                        .success(false)
                        .fieldErrors(ex.getFieldErrors())
                        .build());
    }

    // Xử lý lỗi nghiệp vụ chung (dữ liệu đầu vào không hợp lệ theo logic ứng dụng)
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ex.getMessage()));
    }

    // Xử lý lỗi trạng thái không hợp lệ trong luồng xử lý nghiệp vụ
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ex.getMessage()));
    }

    // Xử lý lỗi xác thực/phân quyền khi người dùng không có quyền truy cập
    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnauthorized(UnauthorizedException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(ex.getMessage()));
    }

    // Xử lý lỗi validation từ annotation (@NotBlank, @Email,...) trên DTO.
    // Gộp tất cả thông báo lỗi thành một chuỗi duy nhất để trả về.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));

        return ResponseEntity.badRequest()
                .body(ApiResponse.error(message));
    }

    // Xử lý tất cả các lỗi không mong đợi còn lại (lỗi DB, lỗi hệ thống,...)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Lỗi hệ thống: " + ex.getMessage()));
    }
}
