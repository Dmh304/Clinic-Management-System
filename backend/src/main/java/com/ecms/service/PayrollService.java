package com.ecms.service;

import com.ecms.dto.request.PayrollItemUpdateRequest;

import java.util.List;
import java.util.Map;

/**
 * UC-54: Quản lý duyệt bảng lương theo kỳ (tháng).
 */
public interface PayrollService {

    /** Sinh (hoặc soạn lại) bảng lương nháp cho một kỳ từ dữ liệu hoạt động. */
    Map<String, Object> generateDraft(int year, int month);

    /** Danh sách các kỳ lương, mới nhất trước. */
    List<Map<String, Object>> listPeriods();

    /** Chi tiết một kỳ lương kèm các dòng lương. */
    Map<String, Object> getPeriod(Long periodId);

    /** Điều chỉnh một dòng lương (chỉ khi kỳ còn DRAFT). */
    Map<String, Object> updateItem(Long itemId, PayrollItemUpdateRequest request);

    /** Duyệt bảng lương: chuyển APPROVED, khóa toàn bộ dòng, ghi Audit Log. */
    Map<String, Object> approve(Long periodId, Long actorUserId);
}
