/**
 * Author: TuanTD
 * 
 * Định nghĩa các trạng thái của một Hồ sơ bệnh án (Medical Record) trong hệ thống
 * Enum này giúp kiểm soát vòng đời của bệnh án từ lúc bác sĩ bắt đầu khám cho đến khi đóng hồ sơ
 */

package com.ecms.entity;

public enum MedicalRecordStatus {
    DRAFT, // Khởi tạo/Bản nháp
    IN_PROGRESS, // Đang thực hiện
    COMPLETED // Đã hoàn thành
}