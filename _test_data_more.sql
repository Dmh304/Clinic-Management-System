SET QUOTED_IDENTIFIER ON;
GO
USE ecms_db;
GO

-- ============================================================
-- Thêm 8 bệnh nhân test (đa dạng tuổi, có cả trẻ em để test CCCD/phụ huynh)
-- Mật khẩu: Password@123
-- LƯU Ý: script này đã được chạy 1 lần rồi (data đã có trong ecms_db).
-- Nếu chạy lại sẽ báo lỗi trùng email (UNIQUE constraint) — đó là bình thường,
-- nghĩa là dữ liệu đã tồn tại, không cần chạy lại.
-- ============================================================
DECLARE @hash NVARCHAR(255) = N'$2a$10$gfSU.mS4YQd7cICUyobl/en..jS9epCm4YpeYiRbllaEL2TbAOGmy';

INSERT INTO users (email, password, full_name, phone_number, date_of_birth, gender, address, status, enabled, role_id, created_at)
VALUES
(N'patient10@gmail.com', @hash, N'Vương Thị Thu',      N'0913000010', '1992-02-14', 'FEMALE', N'20 Lê Văn Sỹ, Q3',     'ACTIVE', 1, 7, GETDATE()),
(N'patient11@gmail.com', @hash, N'Phan Văn Hùng',      N'0913000011', '1988-11-03', 'MALE',   N'21 Cách Mạng Tháng 8', 'ACTIVE', 1, 7, GETDATE()),
(N'patient12@gmail.com', @hash, N'Trương Thị Mai',     N'0913000012', '1999-06-22', 'FEMALE', N'22 Nguyễn Trãi, Q5',   'ACTIVE', 1, 7, GETDATE()),
(N'patient13@gmail.com', @hash, N'Đặng Văn Khoa',      N'0913000013', '1975-09-30', 'MALE',   N'23 Hai Bà Trưng, Q1',  'ACTIVE', 1, 7, GETDATE()),
(N'patient14@gmail.com', @hash, N'Bé Nguyễn An Nhiên', N'0913000010', '2018-05-01', 'FEMALE', N'20 Lê Văn Sỹ, Q3',     'ACTIVE', 1, 7, GETDATE()), -- con của patient10, dùng chung SĐT
(N'patient15@gmail.com', @hash, N'Lâm Thị Hồng',       N'0913000015', '1965-12-12', 'FEMALE', N'25 Điện Biên Phủ',    'ACTIVE', 1, 7, GETDATE()),
(N'patient16@gmail.com', @hash, N'Võ Văn Sơn',         N'0913000016', '2001-03-18', 'MALE',   N'26 Trường Chinh',     'ACTIVE', 1, 7, GETDATE()),
(N'patient17@gmail.com', @hash, N'Bé Trần Gia Bảo',    N'0913000017', '2020-08-09', 'MALE',   N'27 Phan Xích Long',   'ACTIVE', 1, 7, GETDATE());
GO

INSERT INTO patients (user_id, patient_code, full_name, date_of_birth, gender, address, phone, email, cccd, blood_type, emergency_contact_name, emergency_contact_phone, status, created_at)
SELECT u.id, N'PAT' + RIGHT('000' + CAST(u.id AS VARCHAR), 4), u.full_name, u.date_of_birth, u.gender, u.address, u.phone_number, u.email,
    CASE WHEN u.email IN (N'patient14@gmail.com', N'patient17@gmail.com') THEN NULL ELSE N'0790' + RIGHT('00000000' + CAST(u.id AS VARCHAR), 8) END,
    'UNKNOWN',
    CASE WHEN u.email = N'patient14@gmail.com' THEN N'Vương Thị Thu' WHEN u.email = N'patient17@gmail.com' THEN N'Trần Văn Phú' ELSE NULL END,
    CASE WHEN u.email = N'patient14@gmail.com' THEN N'0913000010' WHEN u.email = N'patient17@gmail.com' THEN N'0913000099' ELSE NULL END,
    'ACTIVE', GETDATE()
FROM users u
WHERE u.email IN (N'patient10@gmail.com', N'patient11@gmail.com', N'patient12@gmail.com', N'patient13@gmail.com',
                  N'patient14@gmail.com', N'patient15@gmail.com', N'patient16@gmail.com', N'patient17@gmail.com');
GO

-- ============================================================
-- Thêm ~30 lịch hẹn trải từ 2 tuần trước đến 3 tuần sau, đủ trạng thái
-- để test Calendar view Tuần/Tháng có dữ liệu phong phú
-- ============================================================
DECLARE @i INT = 0;

WHILE @i < 30
BEGIN
    DECLARE @dayOffset INT = (@i % 35) - 14; -- từ -14 đến +20 ngày
    DECLARE @hour INT = 8 + (@i % 9);
    DECLARE @minute INT = (@i % 4) * 15;
    DECLARE @doctorId BIGINT = (@i % 3) + 1;
    DECLARE @serviceId BIGINT = (SELECT TOP 1 id FROM services ORDER BY (ABS(CHECKSUM(NEWID()))));
    DECLARE @patientId BIGINT = (SELECT TOP 1 id FROM patients ORDER BY (ABS(CHECKSUM(NEWID()))));
    DECLARE @apptTime DATETIME2 = DATEADD(MINUTE, @hour*60+@minute, CAST(CAST(DATEADD(DAY, @dayOffset, GETDATE()) AS DATE) AS DATETIME2));
    DECLARE @status VARCHAR(20) =
        CASE
            WHEN @dayOffset < 0 THEN (CASE WHEN @i % 5 = 0 THEN 'CANCELLED' ELSE 'COMPLETED' END)
            WHEN @dayOffset = 0 THEN (CASE @i % 4 WHEN 0 THEN 'WAITING' WHEN 1 THEN 'IN_PROGRESS' WHEN 2 THEN 'CONFIRMED' ELSE 'COMPLETED' END)
            ELSE (CASE WHEN @i % 6 = 0 THEN 'CANCELLED' WHEN @i % 3 = 0 THEN 'CONFIRMED' ELSE 'PENDING' END)
        END;
    DECLARE @type VARCHAR(20) = CASE WHEN @i % 3 = 0 THEN 'WALK_IN' ELSE 'ONLINE' END;

    INSERT INTO appointments (patient_id, doctor_id, service_id, appointment_time, type, status, created_at)
    VALUES (@patientId, @doctorId, @serviceId, @apptTime, @type, @status, GETDATE());

    SET @i = @i + 1;
END
GO

PRINT N'Đã thêm 8 bệnh nhân test + 30 lịch hẹn trải 5 tuần (2 tuần trước → 3 tuần sau).';
GO
