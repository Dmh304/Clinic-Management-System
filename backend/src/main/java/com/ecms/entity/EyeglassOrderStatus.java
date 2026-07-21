package com.ecms.entity;

public enum EyeglassOrderStatus {
    PENDING_CONFIRMATION, // Chờ Lễ tân xác nhận (khi bệnh nhân đặt online)
    PENDING_LAB,          // Chờ Xưởng cắt kính (đẩy xuống Lab)
    IN_PRODUCTION,        // Đang cắt kính
    READY,                // Đã làm xong, chờ đến lấy
    DISPENSED,            // Đã giao cho bệnh nhân
    CANCELLED             // Đã hủy
}
