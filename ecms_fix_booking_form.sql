-- =====================================================================
-- Hỗ trợ form đặt lịch mới (BookingCare-style) + đặt hộ người thân tạo hồ sơ thật.
--  1. appointments.booked_by: lưu user_id của người ĐẶT (để bệnh nhân vẫn thấy
--     lịch đã đặt hộ người thân ở "Lịch hẹn của tôi", dù patient_id là người thân).
--  2. patients.address: VARCHAR → NVARCHAR (sửa lỗi tiếng Việt thành '?' khi lưu địa chỉ).
-- Chạy qua PowerShell System.Data.SqlClient (đọc UTF-8 đúng), KHÔNG dùng sqlcmd -f 65001.
-- =====================================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF COL_LENGTH('appointments', 'booked_by') IS NULL
    ALTER TABLE appointments ADD booked_by BIGINT NULL;
GO

ALTER TABLE patients ALTER COLUMN address NVARCHAR(255) NULL;
GO

-- 3. appointments.notes / cancel_reason: VARCHAR → NVARCHAR (tiếng Việt thành '?'
--    ở phần "Triệu chứng / lý do khám" và lý do huỷ). Dữ liệu đã hỏng trước đó
--    không khôi phục được; chỉ đảm bảo bản ghi MỚI lưu đúng.
ALTER TABLE appointments ALTER COLUMN notes NVARCHAR(MAX);
GO
ALTER TABLE appointments ALTER COLUMN cancel_reason NVARCHAR(MAX);
GO
