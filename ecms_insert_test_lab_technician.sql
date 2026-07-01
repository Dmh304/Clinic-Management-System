-- ============================================================
-- ECMS — Script chèn tài khoản Lab Technician test
-- Email: tridintstudio23@gmail.com
-- Mật khẩu mặc định: Password@123
-- ============================================================

USE ecms_db_final;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Khai báo các biến
DECLARE @NewUserId BIGINT;
DECLARE @LabTechRoleId BIGINT;

-- 2. Kiểm tra xem user đã tồn tại chưa
IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'tridintstudio23@gmail.com')
BEGIN
    -- Lấy role_id của LAB_TECHNICIAN từ bảng roles
    SELECT @LabTechRoleId = id FROM roles WHERE role_name = 'LAB_TECHNICIAN';
    
    -- Nếu không tìm thấy bằng tên, gán mặc định là 6
    IF @LabTechRoleId IS NULL
        SET @LabTechRoleId = 6;

    -- Thêm mới user với mật khẩu mặc định (Password@123)
    -- Mật khẩu mã hoá Bcrypt cho 'Password@123' là '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW'
    INSERT INTO users (email, password, full_name, phone_number, date_of_birth, gender, address, email_verified_at, status, enabled, role_id, created_at)
    VALUES (
        'tridintstudio23@gmail.com', 
        N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW', 
        N'Viên Thuật Kỹ', 
        '0987654321', 
        '1992-05-20', 
        'MALE', 
        N'Địa chỉ phòng xét nghiệm', 
        GETDATE(), 
        'ACTIVE', 
        1, 
        @LabTechRoleId, 
        GETDATE()
    );

    SET @NewUserId = SCOPE_IDENTITY();

    -- Tạo mã kỹ thuật viên duy nhất LTxxx
    DECLARE @MaxTechCode INT;
    DECLARE @LabTechCode NVARCHAR(20);
    
    -- Lấy số lớn nhất từ các mã hiện tại
    SELECT @MaxTechCode = COALESCE(MAX(CAST(SUBSTRING(lab_tech_code, 3, LEN(lab_tech_code)) AS INT)), 0) 
    FROM lab_technicians 
    WHERE lab_tech_code LIKE 'LT%';

    SET @LabTechCode = 'LT' + RIGHT('000' + CAST(@MaxTechCode + 1 AS NVARCHAR(10)), 3);

    -- Thêm mới vào bảng lab_technicians
    INSERT INTO lab_technicians (user_id, lab_tech_code, full_name, license_number, specialization, phone_number, email, status, created_at)
    VALUES (
        @NewUserId,
        @LabTechCode,
        N'Viên Thuật Kỹ',
        N'LT-LIC-' + CAST(200000 + @NewUserId AS NVARCHAR(10)), -- Số chứng chỉ hành nghề duy nhất
        N'Xét nghiệm mắt chuyên sâu',
        '0987654321',
        'tridintstudio23@gmail.com',
        'ACTIVE',
        GETDATE()
    );

    PRINT N'✅ Đã tạo thành công tài khoản Lab Technician tridintstudio23@gmail.com và hồ sơ kỹ thuật viên.';
END
ELSE
BEGIN
    PRINT N'⚠️ Tài khoản tridintstudio23@gmail.com đã tồn tại.';
END
GO
