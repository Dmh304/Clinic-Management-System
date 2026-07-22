-- ============================================================================
-- ECMS — Dữ liệu test bổ sung (KHÔNG thay thế ecms_schema.sql / ecms_data_seed.sql)
--
-- Mục đích: thêm nhiều bệnh nhân + lịch hẹn với đủ loại lý do khám/dịch vụ để
-- test giao diện bác sĩ (mỗi bác sĩ 5 bệnh nhân/ngày), và thêm 1 điều dưỡng thứ 2
-- để test tính năng tự động phân công điều dưỡng theo khung giờ rảnh.
--
-- CHẠY THẾ NÀO:
--   - Mở bằng SSMS → Execute (F5). KHÔNG dùng sqlcmd -f 65001 (đã từng làm hỏng
--     dấu tiếng Việt trên DB này, xem ghi chú lỗi encoding trong dự án).
--   - Đổi "ecms_db" bên dưới thành đúng tên database bạn đang dùng nếu khác
--     (một số máy đặt tên là "ecms_backup").
--   - Chạy TOÀN BỘ file từ đầu đến cuối trong 1 lần (các phần sau phụ thuộc
--     phần trước). File AN TOÀN khi chạy lại nhiều lần — mỗi phần tự kiểm tra
--     đã có dữ liệu chưa trước khi chèn, không tạo trùng.
--
-- Sau khi chạy:
--   - +25 bệnh nhân mới (mã PATX01..PATX25), đủ độ tuổi/giới tính/lý do khám.
--   - +540 lịch hẹn: mỗi bác sĩ (3 bác sĩ) × 5 bệnh nhân/ngày × 36 ngày
--     (7 ngày trước hôm nay → hôm nay → 28 ngày tới), đủ trạng thái
--     COMPLETED/CANCELLED (quá khứ), CONFIRMED (hôm nay/tương lai), PENDING (rải rác).
--   - +1 điều dưỡng thứ 2 (nurse2@ecms.vn), được phân vào "Phòng chăm sóc &
--     phục hồi 2" (room 5, hiện đang trống) để hệ thống tự-động-phân-công có
--     2 điều dưỡng để chọn.
-- ============================================================================

USE ecms_db;
GO
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ============================================================================
-- 1. 25 bệnh nhân test mới — đủ độ tuổi/lý do khám (trẻ em, thanh niên, trung niên,
--    người già), không có tài khoản đăng nhập (kiểu hồ sơ do lễ tân tạo/walk-in).
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM patients WHERE patient_code = N'PATX01')
BEGIN
    INSERT INTO patients
        (patient_code, full_name, date_of_birth, gender, phone, email, address,
         cccd, blood_type, allergy_notes, emergency_contact_name, emergency_contact_phone, status, created_at)
    VALUES
    (N'PATX01', N'Nguyễn Thị Thu',   '1968-02-14', 'FEMALE', N'0914000001', NULL, N'21 Lê Lợi, Q1, TP.HCM',            NULL, 'A',  N'Cao huyết áp',                 N'Nguyễn Văn Hùng',  N'0914100001', 'ACTIVE', GETDATE()),
    (N'PATX02', N'Trần Văn Hải',     '1955-11-02', 'MALE',   N'0914000002', NULL, N'45 Nguyễn Trãi, Q5, TP.HCM',       NULL, 'O',  N'Tiểu đường type 2',            N'Trần Thị Lan',     N'0914100002', 'ACTIVE', GETDATE()),
    (N'PATX03', N'Phạm Thị Nga',     '1972-06-19', 'FEMALE', N'0914000003', NULL, N'12 Điện Biên Phủ, Q.BT, TP.HCM',   NULL, 'B',  NULL,                            N'Phạm Văn Đông',    N'0914100003', 'ACTIVE', GETDATE()),
    (N'PATX04', N'Lê Văn Tâm',       '1999-09-09', 'MALE',   N'0914000004', NULL, N'8 Cách Mạng Tháng 8, Q10, TP.HCM', NULL, 'AB', NULL,                            N'Lê Thị Hồng',      N'0914100004', 'ACTIVE', GETDATE()),
    (N'PATX05', N'Hoàng Thị Mai',    '2010-03-21', 'FEMALE', N'0914000005', NULL, N'33 Trường Chinh, Q.TB, TP.HCM',    NULL, 'O',  N'Dị ứng thời tiết',             N'Hoàng Văn Sơn',    N'0914100005', 'ACTIVE', GETDATE()),
    (N'PATX06', N'Vũ Văn Long',      '2015-07-30', 'MALE',   N'0914000006', NULL, N'19 Hoàng Văn Thụ, Q.PN, TP.HCM',   NULL, 'A',  NULL,                            N'Vũ Thị Hoa',       N'0914100006', 'ACTIVE', GETDATE()),
    (N'PATX07', N'Đặng Thị Hương',   '1988-01-11', 'FEMALE', N'0914000007', NULL, N'7 Nguyễn Đình Chiểu, Q3, TP.HCM',  NULL, 'B',  NULL,                            N'Đặng Văn Tùng',    N'0914100007', 'ACTIVE', GETDATE()),
    (N'PATX08', N'Bùi Văn Nam',      '1993-12-25', 'MALE',   N'0914000008', NULL, N'26 Lý Chính Thắng, Q3, TP.HCM',    NULL, 'O',  NULL,                            N'Bùi Thị Thu',      N'0914100008', 'ACTIVE', GETDATE()),
    (N'PATX09', N'Đỗ Thị Yến',       '1965-05-05', 'FEMALE', N'0914000009', NULL, N'14 Sư Vạn Hạnh, Q10, TP.HCM',      NULL, 'A',  N'Glocom góc mở đang theo dõi',  N'Đỗ Văn Kiên',      N'0914100009', 'ACTIVE', GETDATE()),
    (N'PATX10', N'Ngô Văn Đức',      '1980-08-08', 'MALE',   N'0914000010', NULL, N'50 Ba Tháng Hai, Q10, TP.HCM',     NULL, 'AB', NULL,                            N'Ngô Thị Hạnh',     N'0914100010', 'ACTIVE', GETDATE()),
    (N'PATX11', N'Dương Thị Kim',    '2003-04-17', 'FEMALE', N'0914000011', NULL, N'9 Nguyễn Tri Phương, Q5, TP.HCM',  NULL, 'O',  NULL,                            N'Dương Văn Phong',  N'0914100011', 'ACTIVE', GETDATE()),
    (N'PATX12', N'Trịnh Văn Sơn',    '1976-10-23', 'MALE',   N'0914000012', NULL, N'17 Lê Hồng Phong, Q10, TP.HCM',    NULL, 'B',  N'Đục thủy tinh thể 2 mắt',      N'Trịnh Thị Nhung',  N'0914100012', 'ACTIVE', GETDATE()),
    (N'PATX13', N'Lý Thị Ngọc',      '1991-02-02', 'FEMALE', N'0914000013', NULL, N'31 Cao Thắng, Q3, TP.HCM',         NULL, 'A',  N'Khô mắt mạn tính',             N'Lý Văn Bảo',       N'0914100013', 'ACTIVE', GETDATE()),
    (N'PATX14', N'Phan Văn Khoa',    '1960-06-06', 'MALE',   N'0914000014', NULL, N'6 Kỳ Đồng, Q3, TP.HCM',            NULL, 'O',  N'Tiểu đường, theo dõi đáy mắt', N'Phan Thị Loan',    N'0914100014', 'ACTIVE', GETDATE()),
    (N'PATX15', N'Huỳnh Thị Loan',   '1985-03-15', 'FEMALE', N'0914000015', NULL, N'40 Nam Kỳ Khởi Nghĩa, Q1, TP.HCM', NULL, 'AB', N'Dị ứng phấn hoa',              N'Huỳnh Văn Tài',    N'0914100015', 'ACTIVE', GETDATE()),
    (N'PATX16', N'Đinh Văn Phúc',    '2008-11-11', 'MALE',   N'0914000016', NULL, N'23 Nguyễn Thị Thập, Q7, TP.HCM',   NULL, 'B',  NULL,                            N'Đinh Thị Hà',      N'0914100016', 'ACTIVE', GETDATE()),
    (N'PATX17', N'Mai Thị Thảo',     '1997-07-07', 'FEMALE', N'0914000017', NULL, N'15 Huỳnh Văn Bánh, Q.PN, TP.HCM',  NULL, 'O',  NULL,                            N'Mai Văn Dũng',     N'0914100017', 'ACTIVE', GETDATE()),
    (N'PATX18', N'Chu Văn Hòa',      '1970-09-19', 'MALE',   N'0914000018', NULL, N'11 Phan Đăng Lưu, Q.PN, TP.HCM',   NULL, 'A',  NULL,                            N'Chu Thị Xuân',     N'0914100018', 'ACTIVE', GETDATE()),
    (N'PATX19', N'Tạ Thị Xuân',      '1963-12-12', 'FEMALE', N'0914000019', NULL, N'28 Trần Quốc Thảo, Q3, TP.HCM',    NULL, 'AB', N'Đã mổ Phaco mắt phải',         N'Tạ Văn Hùng',      N'0914100019', 'ACTIVE', GETDATE()),
    (N'PATX20', N'Lâm Văn Quang',    '2001-05-25', 'MALE',   N'0914000020', NULL, N'5 Nguyễn Văn Trỗi, Q.PN, TP.HCM',  NULL, 'B',  NULL,                            N'Lâm Thị Ngọc',     N'0914100020', 'ACTIVE', GETDATE()),
    (N'PATX21', N'Vương Thị Hằng',   '1994-08-18', 'FEMALE', N'0914000021', NULL, N'37 Lê Văn Sỹ, Q3, TP.HCM',         NULL, 'O',  NULL,                            N'Vương Văn Long',   N'0914100021', 'ACTIVE', GETDATE()),
    (N'PATX22', N'Cao Văn Bình',     '1958-01-30', 'MALE',   N'0914000022', NULL, N'20 Trần Não, Q2, TP.HCM',          NULL, 'A',  N'Nghi glocom, tăng nhãn áp',    N'Cao Thị Hương',    N'0914100022', 'ACTIVE', GETDATE()),
    (N'PATX23', N'Đào Thị Vy',       '2012-10-10', 'FEMALE', N'0914000023', NULL, N'42 Quang Trung, Q.GV, TP.HCM',     NULL, 'B',  NULL,                            N'Đào Văn Kiên',     N'0914100023', 'ACTIVE', GETDATE()),
    (N'PATX24', N'Trương Văn Đạt',   '1983-04-04', 'MALE',   N'0914000024', NULL, N'16 Phạm Văn Đồng, Q.TĐ, TP.HCM',   NULL, 'AB', NULL,                            N'Trương Thị Mai',   N'0914100024', 'ACTIVE', GETDATE()),
    (N'PATX25', N'Nguyễn Thị Bích',  '1990-11-20', 'FEMALE', N'0914000025', NULL, N'29 Ung Văn Khiêm, Q.BT, TP.HCM',   NULL, 'O',  N'Cận thị nặng -8 độ',           N'Nguyễn Văn Tân',   N'0914100025', 'ACTIVE', GETDATE());

    PRINT N'✅ Đã thêm 25 bệnh nhân test (PATX01..PATX25).';
END
ELSE
BEGIN
    PRINT N'⏭️  Bộ bệnh nhân test (PATX01..25) đã tồn tại — bỏ qua.';
END
GO

-- ============================================================================
-- 2. Điều dưỡng thứ 2 — phân vào Phòng chăm sóc & phục hồi 2 (room 5, đang trống)
--    để tính năng tự-động-phân-công điều dưỡng có 2 người để chọn.
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM users WHERE email = N'nurse2@ecms.vn')
BEGIN
    DECLARE @NewNurseId TABLE (user_id BIGINT);
    DECLARE @pw2 NVARCHAR(255) = N'$2a$10$gfSU.mS4YQd7cICUyobl/en..jS9epCm4YpeYiRbllaEL2TbAOGmy'; -- Password@123

    INSERT INTO users
        (email, password, full_name, phone_number, date_of_birth, gender,
         address, department, role_id, status, auth_provider, created_at)
    OUTPUT INSERTED.id INTO @NewNurseId(user_id)
    VALUES
        (N'nurse2@ecms.vn', @pw2, N'Đặng Thị Thanh Thảo', N'0901000098', '1997-02-14', 'FEMALE',
         N'22 Cách Mạng Tháng 8, Q3, TP.HCM', N'Điều dưỡng', 7, 'ACTIVE', 'LOCAL', GETDATE());

    DECLARE @NurseUserId BIGINT = (SELECT TOP 1 user_id FROM @NewNurseId);

    INSERT INTO staffs
        (user_id, employee_code, full_name, department, position, phone_number, hire_date, status, created_at)
    VALUES
        (@NurseUserId, N'EMP005', N'Đặng Thị Thanh Thảo', N'Điều dưỡng', N'Điều dưỡng viên', N'0901000098', '2026-07-22', 'ACTIVE', GETDATE());

    INSERT INTO staff_room_assignments
        (staff_user_id, room_id, effective_from, is_override, override_date, assigned_by, created_at)
    VALUES
        (@NurseUserId, 5, '2026-01-01', 0, NULL, 2, GETDATE());

    PRINT N'✅ Đã thêm điều dưỡng thứ 2: nurse2@ecms.vn (Đặng Thị Thanh Thảo, mật khẩu Password@123) — phân vào Phòng chăm sóc & phục hồi 2.';
END
ELSE
BEGIN
    PRINT N'⏭️  Điều dưỡng nurse2@ecms.vn đã tồn tại — bỏ qua.';
END
GO

-- ============================================================================
-- 3. Lịch hẹn — mỗi bác sĩ (3 bác sĩ) × 5 bệnh nhân/ngày × 36 ngày
--    (hôm nay -7 ngày → hôm nay → hôm nay +28 ngày).
--    Trạng thái tự suy theo ngày: quá khứ phần lớn COMPLETED (một số CANCELLED),
--    hôm nay tự COMPLETED/CONFIRMED theo giờ hiện tại lúc chạy script,
--    tương lai CONFIRMED (rải rác PENDING).
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM appointments a JOIN patients p ON a.patient_id = p.id WHERE p.patient_code LIKE N'PATX%')
BEGIN
    DECLARE @NewPatients TABLE (rn INT IDENTITY(1,1) PRIMARY KEY, patient_id BIGINT);
    INSERT INTO @NewPatients (patient_id)
    SELECT id FROM patients WHERE patient_code LIKE N'PATX%' ORDER BY patient_code;

    DECLARE @PatientCount INT = (SELECT COUNT(*) FROM @NewPatients);

    ;WITH Days AS (
        SELECT 0 AS n
        UNION ALL SELECT n + 1 FROM Days WHERE n < 35
    ),
    Doctors(doctor_id) AS (
        SELECT v.doctor_id FROM (VALUES (1),(2),(3)) v(doctor_id)
    ),
    Slots(slot_idx, minutes_from_midnight) AS (
        SELECT v.slot_idx, v.minutes_from_midnight FROM (VALUES (1,450),(2,510),(3,570),(4,810),(5,870)) v(slot_idx, minutes_from_midnight)
    ),
    Reasons(doctor_id, idx, complaint, service_id) AS (
        SELECT v.doctor_id, v.idx, v.complaint, v.service_id FROM (VALUES
            (1,1,N'Mắt đỏ, ngứa và chảy nước mắt 2 ngày nay',9),
            (1,2,N'Cộm xốn như có dị vật trong mắt',9),
            (1,3,N'Khô mắt, mỏi mắt do làm việc máy tính nhiều',9),
            (1,4,N'Ngứa mắt, nghi dị ứng phấn hoa',9),
            (1,5,N'Đau nhức hốc mắt kèm nhìn mờ nhẹ',12),
            (1,6,N'Chảy ghèn vàng buổi sáng, mí mắt sưng',9),
            (1,7,N'Trẻ em kiểm tra mắt định kỳ theo yêu cầu trường học',10),
            (1,8,N'Mắt mỏi, nhìn xa hay bị nhòe cuối ngày',11),
            (1,9,N'Ngứa mí, nghi viêm bờ mi',9),
            (1,10,N'Tái khám theo dõi sau đợt viêm kết mạc',9),
            (2,1,N'Nhìn xa mờ, nghi tăng độ cận',11),
            (2,2,N'Học sinh khám mắt định kỳ đầu năm học, đo độ kính',11),
            (2,3,N'Muốn chuyển sang đeo kính áp tròng, cần đo giác mạc',6),
            (2,4,N'Nhìn gần mờ, nghi lão thị mới xuất hiện',11),
            (2,5,N'Song thị nhẹ khi nhìn xa, cần đo khúc xạ',10),
            (2,6,N'Nhức đầu khi đọc sách lâu, nghi loạn thị',11),
            (2,7,N'Tái khám chỉnh độ kính sau 6 tháng',11),
            (2,8,N'Chóng mặt, mờ mắt khi lái xe ban đêm',10),
            (2,9,N'Muốn kiểm tra lại độ cận trước khi mổ Lasik',6),
            (2,10,N'Mắt lệch nhẹ, phụ huynh đưa bé đi khám khúc xạ',11),
            (3,1,N'Nhìn mờ như có màn sương, nghi đục thủy tinh thể',9),
            (3,2,N'Tái khám sau mổ Phaco mắt phải, kiểm tra vết mổ',9),
            (3,3,N'Chói sáng mạnh khi ra nắng, nhìn đôi nhẹ',13),
            (3,4,N'Tư vấn phẫu thuật Lasik cận thị nặng',9),
            (3,5,N'Đau mắt tăng dần kèm đỏ, nghi tăng nhãn áp',12),
            (3,6,N'Khám tiền phẫu chuẩn bị mổ đục thủy tinh thể',7),
            (3,7,N'Nhìn mờ đột ngột 1 bên mắt, cần loại trừ bong võng mạc',13),
            (3,8,N'Tái khám định kỳ theo dõi đáy mắt tiểu đường',13),
            (3,9,N'Sụp mí mắt trái, ảnh hưởng tầm nhìn',9),
            (3,10,N'Chảy nước mắt sống liên tục, nghi tắc lệ đạo',9)
        ) v(doctor_id, idx, complaint, service_id)
    ),
    Combo AS (
        SELECT
            d.n - 7 AS day_offset,
            doc.doctor_id,
            s.slot_idx,
            s.minutes_from_midnight,
            ROW_NUMBER() OVER (ORDER BY d.n, doc.doctor_id, s.slot_idx) AS rn_all,
            ROW_NUMBER() OVER (PARTITION BY doc.doctor_id ORDER BY d.n, s.slot_idx) AS rn_doc
        FROM Days d
        CROSS JOIN Doctors doc
        CROSS JOIN Slots s
    ),
    Final AS (
        SELECT
            c.day_offset,
            c.doctor_id,
            c.slot_idx,
            c.rn_all,
            CAST(DATEADD(MINUTE, c.minutes_from_midnight, CAST(CAST(DATEADD(DAY, c.day_offset, GETDATE()) AS DATE) AS DATETIME2)) AS DATETIME2) AS appt_time,
            r.complaint,
            r.service_id,
            np.patient_id
        FROM Combo c
        JOIN Reasons r ON r.doctor_id = c.doctor_id AND r.idx = ((c.rn_doc - 1) % 10) + 1
        JOIN @NewPatients np ON np.rn = ((c.rn_all - 1) % @PatientCount) + 1
    )
    INSERT INTO appointments
        (patient_id, doctor_id, service_id, appointment_time, time_slot, type, status,
         notes, queue_number, check_in_time, check_in_by, booked_by,
         cancel_reason, cancelled_by, cancelled_at, created_at)
    SELECT
        f.patient_id,
        f.doctor_id,
        f.service_id,
        f.appt_time,
        FORMAT(f.appt_time, 'HH:mm') + N' - ' + FORMAT(DATEADD(MINUTE, ISNULL(s.duration_minutes, 30), f.appt_time), 'HH:mm'),
        'WALK_IN',
        CASE
            WHEN f.day_offset < 0 AND f.rn_all % 11 = 0 THEN 'CANCELLED'
            WHEN f.day_offset < 0 THEN 'COMPLETED'
            WHEN f.day_offset = 0 AND f.appt_time < GETDATE() THEN 'COMPLETED'
            WHEN f.day_offset = 0 THEN 'CONFIRMED'
            WHEN f.day_offset > 0 AND f.rn_all % 7 = 0 THEN 'PENDING'
            ELSE 'CONFIRMED'
        END,
        f.complaint,
        CASE WHEN (f.day_offset < 0 AND f.rn_all % 11 <> 0) OR (f.day_offset = 0 AND f.appt_time < GETDATE()) THEN f.slot_idx ELSE NULL END,
        CASE WHEN (f.day_offset < 0 AND f.rn_all % 11 <> 0) OR (f.day_offset = 0 AND f.appt_time < GETDATE()) THEN DATEADD(MINUTE, -5, f.appt_time) ELSE NULL END,
        CASE WHEN (f.day_offset < 0 AND f.rn_all % 11 <> 0) OR (f.day_offset = 0 AND f.appt_time < GETDATE()) THEN 6 ELSE NULL END,
        NULL,
        CASE WHEN f.day_offset < 0 AND f.rn_all % 11 = 0 THEN N'Bệnh nhân gọi điện xin dời lịch, chưa sắp xếp lại' ELSE NULL END,
        CASE WHEN f.day_offset < 0 AND f.rn_all % 11 = 0 THEN 6 ELSE NULL END,
        CASE WHEN f.day_offset < 0 AND f.rn_all % 11 = 0 THEN f.appt_time ELSE NULL END,
        DATEADD(DAY, f.day_offset, GETDATE())
    FROM Final f
    LEFT JOIN services s ON s.id = f.service_id
    OPTION (MAXRECURSION 100);

    PRINT N'✅ Đã thêm ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + N' lịch hẹn test (3 bác sĩ × 5 BN/ngày × 36 ngày).';
END
ELSE
BEGIN
    PRINT N'⏭️  Lịch hẹn test cho bộ bệnh nhân PATX đã tồn tại — bỏ qua.';
END
GO

PRINT N'';
PRINT N'====================================================================';
PRINT N'✅ Hoàn tất bơm dữ liệu test bổ sung.';
PRINT N'   Đăng nhập điều dưỡng thứ 2: nurse2@ecms.vn / Password@123';
PRINT N'====================================================================';
GO
