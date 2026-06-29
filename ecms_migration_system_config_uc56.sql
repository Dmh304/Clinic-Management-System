-- UC-56 - Configure System and Data
-- 1) Tạo bảng mới notification_templates: mẫu nội dung email/SMS/in-app gửi cho user.
--    Khác với bảng "notifications" hiện có (lưu các bản ghi ĐÃ gửi) — bảng này lưu cấu hình mẫu.
--    "Xóa" template = set is_active = 0 (BR-09), không hard delete.
-- 2) Seed các config_key cho "Clinic Info" vào bảng system_configs đã có sẵn (BR-09 không hard
--    delete config — chỉ thêm key mới nếu chưa tồn tại, không động vào key đã có).
--
-- Chạy thủ công bởi DBA trên DB ecms_db trước khi deploy code có liên quan.

USE ecms_db;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'notification_templates')
BEGIN
    CREATE TABLE notification_templates (
        id             BIGINT          NOT NULL IDENTITY(1,1),
        template_key   NVARCHAR(100)   NOT NULL,
        channel        NVARCHAR(20)    NOT NULL,
        subject        NVARCHAR(255)   NULL,
        body           NVARCHAR(MAX)   NOT NULL,
        variables_hint NVARCHAR(MAX)   NULL,
        is_active      BIT             NOT NULL DEFAULT 1,
        updated_by     BIGINT          NULL,
        updated_at     DATETIME2       NULL,
        CONSTRAINT PK_notification_templates PRIMARY KEY (id),
        CONSTRAINT UQ_notification_templates_key UNIQUE (template_key),
        CONSTRAINT FK_notification_templates_updated_by FOREIGN KEY (updated_by) REFERENCES users(id),
        CONSTRAINT CK_notification_templates_channel CHECK (channel IN ('EMAIL', 'SMS', 'IN_APP'))
    );
END
GO

-- Seed data: cấu hình thông tin chung của clinic (UC-56, Clinic Info tab)
IF NOT EXISTS (SELECT 1 FROM system_configs WHERE config_key = 'CLINIC_NAME')
BEGIN
    INSERT INTO system_configs (config_key, config_value, data_type, description) VALUES
        ('CLINIC_NAME',    N'ECMS Clinic',            'STRING', N'Tên phòng khám'),
        ('CLINIC_PHONE',   N'0000000000',             'STRING', N'Số điện thoại liên hệ của phòng khám'),
        ('CLINIC_ADDRESS', N'',                       'STRING', N'Địa chỉ phòng khám'),
        ('CLINIC_HOURS',   N'08:00 - 17:00',          'STRING', N'Giờ làm việc của phòng khám');
END
GO
