// UC-57 - Manage System Audit Log
// Service nền tảng dùng chung cho toàn hệ thống: ghi audit log (append-only) và cho phép
// Admin xem/filter/export. Các use case khác (UC-55, UC-56, ...) gọi log(...) để ghi lại
// thao tác của mình; phạm vi tích hợp đó nằm ngoài UC-57.
package com.ecms.service;

import com.ecms.dto.response.AuditLogResponse;
import com.ecms.dto.response.PageResponse;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.time.LocalDateTime;

public interface AuditLogService {

    // Ghi một bản ghi audit log mới. oldValue/newValue được serialize sang JSON.
    void log(Long actorUserId, String action, String entityType, String entityId,
             Object oldValue, Object newValue, String ipAddress);

    // Lấy danh sách audit log có phân trang, kết hợp được nhiều điều kiện filter cùng lúc.
    PageResponse<AuditLogResponse> search(Long actorId, String action, String entityType,
                                           String entityId, LocalDateTime dateFrom, LocalDateTime dateTo,
                                           int page, int size);

    // Lấy chi tiết một bản ghi audit log theo id.
    AuditLogResponse getById(Long id);

    // Export CSV đúng theo các điều kiện filter đang áp dụng (không xuất toàn bộ log).
    void exportCsv(Long actorId, String action, String entityType, String entityId,
                   LocalDateTime dateFrom, LocalDateTime dateTo, HttpServletResponse response) throws IOException;
}
