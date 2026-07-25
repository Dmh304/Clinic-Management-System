-- ============================================================================
-- Patch cho DB đã có sẵn (chạy 1 lần, an toàn khi chạy lại nhiều lần):
--   Cho phép feedbacks đánh giá buổi dịch vụ do ĐIỀU DƯỠNG đảm nhiệm (CareSession),
--   không chỉ lịch khám bác sĩ (Appointment) như trước.
--
--   1) feedbacks.appointment_id: NOT NULL -> NULL
--   2) feedbacks.care_session_id (mới, NULL) + FK -> care_sessions(id)
--   3) feedbacks.nurse_id (mới, NULL) + FK -> users(id)
--   4) CK_feedbacks_subject: đúng 1 trong 2 (appointment_id / care_session_id) khác NULL
--   5) (tuỳ chọn) 1 dòng feedback demo cho buổi dịch vụ điều dưỡng, chỉ thêm nếu
--      chưa có id=4 và care_sessions id=2 tồn tại (khớp ecms_data_seed.sql hiện tại)
-- ============================================================================
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- 1) Nới lỏng NOT NULL trên appointment_id
IF EXISTS (
    SELECT 1 FROM sys.columns c JOIN sys.tables t ON c.object_id = t.object_id
    WHERE t.name = 'feedbacks' AND c.name = 'appointment_id' AND c.is_nullable = 0
)
BEGIN
    ALTER TABLE feedbacks ALTER COLUMN appointment_id BIGINT NULL;
END
GO

-- 2) care_session_id + FK
IF NOT EXISTS (
    SELECT 1 FROM sys.columns c JOIN sys.tables t ON c.object_id = t.object_id
    WHERE t.name = 'feedbacks' AND c.name = 'care_session_id'
)
BEGIN
    ALTER TABLE feedbacks ADD care_session_id BIGINT NULL;
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_feedbacks_care_session')
BEGIN
    ALTER TABLE feedbacks ADD CONSTRAINT FK_feedbacks_care_session
        FOREIGN KEY (care_session_id) REFERENCES care_sessions(id);
END
GO

-- 3) nurse_id + FK
IF NOT EXISTS (
    SELECT 1 FROM sys.columns c JOIN sys.tables t ON c.object_id = t.object_id
    WHERE t.name = 'feedbacks' AND c.name = 'nurse_id'
)
BEGIN
    ALTER TABLE feedbacks ADD nurse_id BIGINT NULL;
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_feedbacks_nurse')
BEGIN
    ALTER TABLE feedbacks ADD CONSTRAINT FK_feedbacks_nurse
        FOREIGN KEY (nurse_id) REFERENCES users(id);
END
GO

-- 4) Đúng 1 trong 2 khác NULL
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_feedbacks_subject')
BEGIN
    ALTER TABLE feedbacks ADD CONSTRAINT CK_feedbacks_subject CHECK (
        (CASE WHEN appointment_id IS NULL THEN 0 ELSE 1 END)
      + (CASE WHEN care_session_id IS NULL THEN 0 ELSE 1 END) = 1
    );
END
GO

-- 5) Demo: 1 feedback cho buổi dịch vụ điều dưỡng (care_session id=2, nurse id=15
--    theo ecms_data_seed.sql) — chỉ thêm nếu chưa có và dữ liệu tham chiếu tồn tại.
IF NOT EXISTS (SELECT 1 FROM feedbacks WHERE id = 4)
   AND EXISTS (SELECT 1 FROM care_sessions WHERE id = 2)
BEGIN
    SET IDENTITY_INSERT feedbacks ON;
    INSERT INTO feedbacks
        (id, patient_id, appointment_id, care_session_id, doctor_id, nurse_id, rating, content, is_anonymous, status, created_at)
    VALUES
    (4, 1, NULL, 2, NULL, 15, 5,
        N'Điều dưỡng nhẹ nhàng, hướng dẫn bài tập tại nhà rất dễ hiểu. Mắt đỡ mỏi hẳn sau buổi massage.',
        0, 'APPROVED', DATEADD(DAY,-7,GETDATE()));
    SET IDENTITY_INSERT feedbacks OFF;
END
GO

PRINT N'✅ Patch feedback_care_session hoàn tất.';
