-- ============================================================
-- ECMS — Migration: UC-13 bảng notifications (thông báo nhân viên)
-- Chỉ chạy file này nếu DB của bạn đã được tạo TRƯỚC khi bổ sung
-- tính năng thông báo UC-13. Nếu tạo DB mới từ ecms_schema.sql (bản
-- mới nhất đã bao gồm bảng này) thì KHÔNG cần chạy file này.
--
-- LƯU Ý: Bảng notifications cũ (per-user: user_id/channel/body/...)
-- chỉ là placeholder, KHÔNG được code nào sử dụng. UC-13 thay bằng
-- thiết kế broadcast theo vai trò (target_role). File này DROP bảng
-- cũ (nếu có) rồi tạo lại theo cấu trúc mới.
--
-- Nội dung:
--   1. Drop bảng notifications cũ (nếu tồn tại)
--   2. Tạo lại bảng notifications — tin nhắn hiển thị cho người dùng
--      (chuông thông báo), broadcast theo vai trò (target_role).
--      Tách biệt hoàn toàn với audit_logs (log hành động).
-- ============================================================

USE ecms_db;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Bỏ bảng cũ (placeholder không dùng tới) trước khi tạo lại
IF OBJECT_ID('notifications', 'U') IS NOT NULL
    DROP TABLE notifications;
GO

-- 2. Tạo lại theo thiết kế UC-13 (kiểu Facebook):
--    thông báo nhắm riêng 1 user (target_user_id) HOẶC broadcast theo vai trò (target_role).
CREATE TABLE notifications (
    id                     BIGINT          NOT NULL IDENTITY(1,1),
    message                NVARCHAR(500)   NULL,
    target_role            NVARCHAR(50)    NULL,
    target_user_id         BIGINT          NULL,
    related_appointment_id BIGINT          NULL,
    is_read                BIT             NOT NULL DEFAULT 0,
    created_at             DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_notifications PRIMARY KEY (id)
);
GO

-- Index hỗ trợ truy vấn theo người nhận + trạng thái đọc (đếm chưa đọc, list)
CREATE INDEX IX_notifications_role_read ON notifications (target_role, is_read);
CREATE INDEX IX_notifications_user_read ON notifications (target_user_id, is_read);
GO

PRINT N'✅ Migration notifications hoàn tất: tạo lại bảng notifications (nhắm user/vai trò) + 2 index.';
GO
