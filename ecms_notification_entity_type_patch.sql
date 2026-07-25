-- ============================================================================
-- Patch cho DB đã có sẵn (chạy 1 lần, an toàn khi chạy lại nhiều lần):
--   Thêm notifications.related_entity_type — cho phép 1 thông báo trỏ tới bất kỳ
--   thực thể nào (CARE_SESSION, SUBSCRIPTION, PROMOTION, FEEDBACK...), không chỉ
--   Appointment như trước — để chuông thông báo điều hướng đúng trang khi click.
--   related_appointment_id vẫn giữ tên cột cũ nhưng từ nay mang ID của bất kỳ
--   thực thể nào, đọc kèm related_entity_type để biết đang trỏ tới cái gì.
-- ============================================================================
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns c JOIN sys.tables t ON c.object_id = t.object_id
    WHERE t.name = 'notifications' AND c.name = 'related_entity_type'
)
BEGIN
    ALTER TABLE notifications ADD related_entity_type NVARCHAR(30) NULL;
END
GO

-- Gán mặc định 'APPOINTMENT' cho các thông báo cũ đã có related_appointment_id
-- (đúng với thực tế trước khi có patch này — mọi thông báo có ID đều là lịch hẹn).
UPDATE notifications
SET related_entity_type = 'APPOINTMENT'
WHERE related_appointment_id IS NOT NULL AND related_entity_type IS NULL;
GO

PRINT N'✅ Patch notification_entity_type hoàn tất.';
