/**
 * Author: TuanTD
 * 
 * Định nghĩa các mức độ ưu tiên của đơn yêu cầu xét nghiệm
 */

package com.ecms.entity;

public enum LabPriority {
    EMERGENCY,          // Mức độ khẩn cấp (Cấp cứu). Cần được xử lý ngay lập tức
    WARNING,            // Mức độ cảnh báo/ưu tiên cao. Cần được ưu tiên xử lý trước các ca thông thường
    PRIMARY             // Mức độ thông thường (Tiêu chuẩn). Được xử lý theo thứ tự tiếp nhận thông thường
}
