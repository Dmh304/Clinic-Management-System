-- ============================================================
-- Script to insert 10 test appointments with WAITING status
-- Distributes records across patients, prioritizing Bùi Văn Bệnh Nhân (patient_id = 1)
-- ============================================================

USE ecms_db_final;
GO

-- 1. Insert WAITING appointments
INSERT INTO appointments
    (patient_id, doctor_id, service_id, appointment_date, appointment_time, time_slot, type,
     notes, queue_number, check_in_time, check_in_by, status, reminder_sent, created_at)
VALUES
    -- Patient 1: Bùi Văn Bệnh Nhân (4 appointments)
    (1, 1, 1, '2026-06-30', '2026-06-30 08:00:00', '08:00', 'WALK_IN', N'Khám định kỳ mắt', 1, '2026-06-30 07:55:00', 6, 'WAITING', 0, GETDATE()),
    (1, 2, 2, '2026-06-30', '2026-06-30 09:30:00', '09:30', 'ONLINE', N'Nhức mỏi mắt khi dùng máy tính', 1, '2026-06-30 09:25:00', 7, 'WAITING', 0, GETDATE()),
    (1, 3, 3, '2026-06-30', '2026-06-30 11:00:00', '11:00', 'WALK_IN', N'Khám tổng quát mắt và giác mạc', 2, '2026-06-30 10:55:00', 6, 'WAITING', 0, GETDATE()),
    (1, 4, 4, '2026-06-30', '2026-06-30 14:00:00', '14:00', 'ONLINE', N'Thư giãn mắt sau phẫu thuật', 1, '2026-06-30 13:55:00', 7, 'WAITING', 0, GETDATE()),

    -- Patient 2: Đinh Thị Hoa (2 appointments)
    (2, 1, 5, '2026-06-30', '2026-06-30 08:30:00', '08:30', 'WALK_IN', N'Tập phục hồi thị lực cận thị', 2, '2026-06-30 08:25:00', 6, 'WAITING', 0, GETDATE()),
    (2, 2, 6, '2026-06-30', '2026-06-30 10:00:00', '10:00', 'ONLINE', N'Chụp bản đồ giác mạc định kỳ', 2, '2026-06-30 09:55:00', 7, 'WAITING', 0, GETDATE()),

    -- Patient 3: Lê Văn Minh (2 appointments)
    (3, 3, 7, '2026-06-30', '2026-06-30 09:00:00', '09:00', 'WALK_IN', N'Xét nghiệm máu trước tiểu phẫu', 1, '2026-06-30 08:55:00', 6, 'WAITING', 0, GETDATE()),
    (3, 4, 8, '2026-06-30', '2026-06-30 14:30:00', '14:30', 'ONLINE', N'Tư vấn đục thủy tinh thể', 2, '2026-06-30 14:25:00', 7, 'WAITING', 0, GETDATE()),

    -- Patient 4: Ngô Thị Lan (1 appointment)
    (4, 1, 9, '2026-06-30', '2026-06-30 10:30:00', '10:30', 'WALK_IN', N'Kiểm tra thị lực định kỳ', 3, '2026-06-30 10:25:00', 6, 'WAITING', 0, GETDATE()),

    -- Patient 5: Tô Văn Dũng (1 appointment)
    (5, 2, 10, '2026-06-30', '2026-06-30 15:00:00', '15:00', 'ONLINE', N'Đo kính cận mới', 3, '2026-06-30 14:55:00', 7, 'WAITING', 0, GETDATE());
GO

-- Print execution message
PRINT 'Successfully inserted 10 WAITING appointments.';
GO
