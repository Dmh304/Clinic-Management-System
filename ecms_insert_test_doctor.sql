-- ============================================================
-- ECMS — Script chèn tài khoản Doctor test
-- Email: trinhdinhtuan23@gmail.com
-- Mật khẩu mặc định: Password@123
-- ============================================================

USE ecms_db;
GO

-- 1. Khai báo biến lưu user_id mới
DECLARE @NewUserId BIGINT;

-- 2. Kiểm tra xem user đã tồn tại chưa
IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'trinhdinhtuan23@gmail.com')
BEGIN
    -- Lấy role_id của DOCTOR
    DECLARE @DoctorRoleId BIGINT;
    SELECT @DoctorRoleId = id FROM roles WHERE role_name = 'DOCTOR';

    -- Thêm mới user với mật khẩu mặc định (Password@123)
    -- Mật khẩu mã hoá Bcrypt cho 'Password@123' là '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW'
    INSERT INTO users (email, password, full_name, phone_number, date_of_birth, gender, address, email_verified_at, status, enabled, role_id, created_at)
    VALUES (
        'trinhdinhtuan23@gmail.com', 
        N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW', 
        N'BS. Trịnh Đình Tuấn', 
        '0901234567', 
        '1990-01-01', 
        'MALE', 
        N'Địa chỉ Bác sĩ Tuấn', 
        GETDATE(), 
        'ACTIVE', 
        1, 
        @DoctorRoleId, 
        GETDATE()
    );

    SET @NewUserId = SCOPE_IDENTITY();

    -- Thêm mới vào bảng doctors
    -- Tạo mã bác sĩ duy nhất DRxxx
    DECLARE @MaxDoctorCode INT;
    DECLARE @DoctorCode NVARCHAR(20);
    
    -- Lấy số lớn nhất từ các mã bác sĩ hiện tại
    SELECT @MaxDoctorCode = COALESCE(MAX(CAST(SUBSTRING(doctor_code, 3, LEN(doctor_code)) AS INT)), 0) 
    FROM doctors 
    WHERE doctor_code LIKE 'DR%';

    SET @DoctorCode = 'DR' + RIGHT('000' + CAST(@MaxDoctorCode + 1 AS NVARCHAR(10)), 3);

    INSERT INTO doctors (user_id, doctor_code, full_name, license_number, specialty, department, phone_number, email, experience_years, bio, status, created_at)
    VALUES (
        @NewUserId,
        @DoctorCode,
        N'BS. Trịnh Đình Tuấn',
        N'BV-HCM-' + CAST(100000 + @NewUserId AS NVARCHAR(10)), -- Số chứng chỉ hành nghề duy nhất
        N'Khoa mắt tổng quát',
        N'Phòng khám tổng quát',
        '0901234567',
        'trinhdinhtuan23@gmail.com',
        5,
        N'Bác sĩ Trịnh Đình Tuấn kiểm thử hệ thống.',
        'ACTIVE',
        GETDATE()
    );

    PRINT N'✅ Đã tạo thành công tài khoản doctor trinhdinhtuan23@gmail.com và thông tin bác sĩ.';
END
ELSE
BEGIN
    PRINT N'⚠️ Tài khoản trinhdinhtuan23@gmail.com đã tồn tại.';
END
GO
