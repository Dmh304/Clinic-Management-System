-- ============================================================================
-- ECMS — Eyes Clinic Management System
-- FILE 1/2: SCHEMA (tạo database + toàn bộ bảng + dữ liệu cấu hình mặc định)
--
-- CÁCH CHẠY (chọn 1 trong 2):
--   1. SSMS  : mở file này → bấm Execute (F5). Chạy xong mở tiếp ecms_data_seed.sql.
--   2. sqlcmd: sqlcmd -S localhost,1433 -U sa -P <password> -C -f 65001 -i ecms_schema.sql
--              (bắt buộc có -f 65001 để đọc đúng tiếng Việt UTF-8)
--
-- Script tự tạo database `ecms_db` nếu chưa có. Nếu backend của bạn trỏ tới
-- tên DB khác (xem spring.datasource.url trong application.properties) thì
-- sửa tên DB ở khối USE bên dưới cho khớp.
--
-- Schema này được đối chiếu 1-1 với các entity JPA trong
-- backend/src/main/java/com/ecms/entity (nguồn sự thật là code backend).
-- Đã gộp toàn bộ các file migration/fix cũ:
--   ecms_migration_lab_features, ecms_migration_notifications,
--   ecms_migration_admin_user_management (UC-55), ecms_migration_system_config_uc56,
--   ecms_add_is_popular, ecms_fix_services_schema, ecms_fix_booking_form,
--   ecms_fix_lab_priority/status_constraint*, ecms_fix_*_encoding*
-- Các bảng cũ KHÔNG còn code nào dùng đã được loại bỏ:
--   refresh_tokens, password_reset_tokens (thay bằng verification_tokens),
--   glasses_orders, lab_order_items, service_assignments, backup_logs.
-- ============================================================================

IF DB_ID('ecms_db') IS NULL
    CREATE DATABASE ecms_db;
GO

USE ecms_db;
GO
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ============================================================================
-- PHẦN 1 — CÁC BẢNG BACKEND ĐANG SỬ DỤNG (khớp entity JPA)
-- Thứ tự tạo bảng đã sắp theo FK dependency.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. roles — vai trò người dùng (mỗi user đúng 1 role qua users.role_id)
-- ----------------------------------------------------------------------------
CREATE TABLE roles (
    id          BIGINT          NOT NULL IDENTITY(1,1),
    role_name   NVARCHAR(50)    NOT NULL,
    description NVARCHAR(MAX)   NULL,
    status      NVARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    created_at  DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at  DATETIME2       NULL,
    CONSTRAINT PK_roles PRIMARY KEY (id),
    CONSTRAINT UQ_roles_role_name UNIQUE (role_name),
    CONSTRAINT CK_roles_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
GO

-- ----------------------------------------------------------------------------
-- 2. users — tài khoản đăng nhập (mọi vai trò)
-- auth_provider: LOCAL (email+mật khẩu) / GOOGLE (OAuth, password có thể NULL)
-- token_version: tăng khi admin deactivate để vô hiệu hoá JWT đã cấp (UC-55)
-- deleted_at: soft delete tài khoản nhân viên (UC-55)
-- date_of_birth/gender/address/avatar_url: cột hồ sơ mở rộng (entity chưa map,
--   giữ lại cho dữ liệu demo và tính năng hồ sơ sau này)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id                    BIGINT          NOT NULL IDENTITY(1,1),
    email                 NVARCHAR(255)   NOT NULL,
    password              NVARCHAR(255)   NULL,
    full_name             NVARCHAR(255)   NOT NULL,
    phone_number          NVARCHAR(20)    NULL,
    date_of_birth         DATE            NULL,
    gender                NVARCHAR(20)    NULL,
    address               NVARCHAR(MAX)   NULL,
    avatar_url            NVARCHAR(500)   NULL,
    department            NVARCHAR(100)   NULL,
    role_id               BIGINT          NOT NULL,
    status                NVARCHAR(30)    NOT NULL DEFAULT 'ACTIVE',
    auth_provider         NVARCHAR(20)    NOT NULL DEFAULT 'LOCAL',
    failed_login_attempts INT             NOT NULL DEFAULT 0,
    lock_until            DATETIME2       NULL,
    token_version         INT             NOT NULL DEFAULT 0,
    created_at            DATETIME2       NOT NULL DEFAULT GETDATE(),
    deleted_at            DATETIME2       NULL,
    CONSTRAINT PK_users PRIMARY KEY (id),
    CONSTRAINT UQ_users_email UNIQUE (email),
    CONSTRAINT FK_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
    CONSTRAINT CK_users_gender CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    CONSTRAINT CK_users_status CHECK (status IN ('PENDING_VERIFICATION', 'ACTIVE', 'LOCKED', 'DISABLED')),
    CONSTRAINT CK_users_auth_provider CHECK (auth_provider IN ('LOCAL', 'GOOGLE'))
);
GO

-- ----------------------------------------------------------------------------
-- 3. verification_tokens — OTP/token xác thực email, đặt lại mật khẩu…
-- (thay thế 2 bảng cũ refresh_tokens + password_reset_tokens)
-- ----------------------------------------------------------------------------
CREATE TABLE verification_tokens (
    id          BIGINT          NOT NULL IDENTITY(1,1),
    user_id     BIGINT          NOT NULL,
    token_hash  NVARCHAR(128)   NOT NULL,
    type        NVARCHAR(30)    NOT NULL,
    expires_at  DATETIME2       NOT NULL,
    used        BIT             NOT NULL DEFAULT 0,
    created_at  DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_verification_tokens PRIMARY KEY (id),
    CONSTRAINT FK_verification_tokens_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT CK_verification_tokens_type CHECK (type IN ('EMAIL_VERIFY', 'PASSWORD_RESET', 'LOGIN_OTP', 'CHANGE_PASSWORD_OTP'))
);
GO
CREATE INDEX IX_verification_tokens_user ON verification_tokens (user_id, type);
GO

-- ----------------------------------------------------------------------------
-- 4. patients — hồ sơ bệnh nhân
-- user_id NULL = bệnh nhân vãng lai / người thân được đặt hộ, chưa có tài khoản
-- ----------------------------------------------------------------------------
CREATE TABLE patients (
    id                      BIGINT          NOT NULL IDENTITY(1,1),
    user_id                 BIGINT          NULL,
    patient_code            NVARCHAR(20)    NULL,
    full_name               NVARCHAR(255)   NOT NULL,
    date_of_birth           DATE            NULL,
    gender                  NVARCHAR(20)    NULL,
    phone                   NVARCHAR(15)    NULL,
    email                   NVARCHAR(255)   NULL,
    address                 NVARCHAR(MAX)   NULL,
    cccd                    NVARCHAR(12)    NULL,
    blood_type              NVARCHAR(20)    NOT NULL DEFAULT 'UNKNOWN',
    allergy_notes           NVARCHAR(MAX)   NULL,
    emergency_contact_name  NVARCHAR(255)   NULL,
    emergency_contact_phone NVARCHAR(15)    NULL,
    status                  NVARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    created_at              DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at              DATETIME2       NULL,
    CONSTRAINT PK_patients PRIMARY KEY (id),
    CONSTRAINT FK_patients_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT CK_patients_gender CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    CONSTRAINT CK_patients_blood_type CHECK (blood_type IN ('A', 'B', 'AB', 'O', 'UNKNOWN')),
    CONSTRAINT CK_patients_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
GO
-- Filtered index: cho phép nhiều NULL (SQL Server UNIQUE thường chỉ cho 1 NULL)
CREATE UNIQUE INDEX UQ_patients_user_id      ON patients(user_id)      WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX UQ_patients_patient_code ON patients(patient_code) WHERE patient_code IS NOT NULL;
CREATE UNIQUE INDEX UQ_patients_cccd         ON patients(cccd)         WHERE cccd IS NOT NULL;
GO

-- ----------------------------------------------------------------------------
-- 5. doctors — hồ sơ chuyên môn Bác sĩ (1-1 với users qua user_id)
-- ----------------------------------------------------------------------------
CREATE TABLE doctors (
    id               BIGINT          NOT NULL IDENTITY(1,1),
    user_id          BIGINT          NOT NULL,
    doctor_code      NVARCHAR(20)    NOT NULL,
    full_name        NVARCHAR(255)   NOT NULL,
    license_number   NVARCHAR(100)   NOT NULL,
    specialty        NVARCHAR(100)   NULL,
    department       NVARCHAR(255)   NULL,
    phone_number     NVARCHAR(15)    NULL,
    email            NVARCHAR(255)   NULL,
    experience_years INT             NULL,
    bio              NVARCHAR(MAX)   NULL,
    avatar_url       NVARCHAR(500)   NULL,
    status           NVARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    created_at       DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at       DATETIME2       NULL,
    CONSTRAINT PK_doctors PRIMARY KEY (id),
    CONSTRAINT UQ_doctors_user_id UNIQUE (user_id),
    CONSTRAINT UQ_doctors_doctor_code UNIQUE (doctor_code),
    CONSTRAINT UQ_doctors_license_number UNIQUE (license_number),
    CONSTRAINT FK_doctors_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT CK_doctors_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
GO

-- ----------------------------------------------------------------------------
-- 6. lab_technicians — hồ sơ chuyên môn Kỹ thuật viên xét nghiệm (1-1 users)
-- ----------------------------------------------------------------------------
CREATE TABLE lab_technicians (
    id              BIGINT          NOT NULL IDENTITY(1,1),
    user_id         BIGINT          NOT NULL,
    lab_tech_code   NVARCHAR(20)    NOT NULL,
    full_name       NVARCHAR(255)   NOT NULL,
    license_number  NVARCHAR(100)   NULL,
    specialization  NVARCHAR(255)   NULL,
    phone_number    NVARCHAR(15)    NULL,
    email           NVARCHAR(255)   NULL,
    status          NVARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    created_at      DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at      DATETIME2       NULL,
    CONSTRAINT PK_lab_technicians PRIMARY KEY (id),
    CONSTRAINT UQ_lab_technicians_user_id UNIQUE (user_id),
    CONSTRAINT UQ_lab_technicians_lab_tech_code UNIQUE (lab_tech_code),
    CONSTRAINT FK_lab_technicians_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT CK_lab_technicians_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
GO

-- ----------------------------------------------------------------------------
-- 7. service_categories — nhóm dịch vụ (hiển thị trang dịch vụ công khai)
-- ----------------------------------------------------------------------------
CREATE TABLE service_categories (
    id            BIGINT          NOT NULL IDENTITY(1,1),
    name          NVARCHAR(300)   NOT NULL,
    slug          NVARCHAR(200)   NULL,
    display_order INT             NOT NULL DEFAULT 0,
    CONSTRAINT PK_service_categories PRIMARY KEY (id),
    CONSTRAINT UQ_service_categories_slug UNIQUE (slug)
);
GO

-- ----------------------------------------------------------------------------
-- 8. services — dịch vụ của phòng khám
-- service_type: CLINICAL (khám/chẩn đoán — hiện ở lịch khám)
--               CARE     (gói chăm sóc mắt — hiện ở trang dịch vụ công khai)
-- is_popular: gói nổi bật, sắp xếp lên đầu danh sách
-- ----------------------------------------------------------------------------
CREATE TABLE services (
    id                BIGINT          NOT NULL IDENTITY(1,1),
    name              NVARCHAR(255)   NOT NULL,
    description       NVARCHAR(500)   NULL,
    price             DECIMAL(12,2)   NULL,
    duration_minutes  INT             NULL,
    category_id       BIGINT          NULL,
    slug              NVARCHAR(200)   NULL,
    thumbnail_url     NVARCHAR(500)   NULL,
    content           NVARCHAR(MAX)   NULL,
    badge             NVARCHAR(50)    NULL,
    price_label       NVARCHAR(100)   NULL,
    sessions_included INT             NULL,
    validity_days     INT             NULL,
    service_type      NVARCHAR(20)    NOT NULL DEFAULT 'CARE',
    is_active         BIT             NOT NULL DEFAULT 1,
    is_popular        BIT             NOT NULL DEFAULT 0,
    display_order     INT             NOT NULL DEFAULT 0,
    created_at        DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at        DATETIME2       NULL,
    CONSTRAINT PK_services PRIMARY KEY (id),
    CONSTRAINT FK_services_category FOREIGN KEY (category_id) REFERENCES service_categories(id),
    CONSTRAINT CK_services_service_type CHECK (service_type IN ('CLINICAL', 'CARE'))
);
GO
CREATE UNIQUE INDEX UQ_services_slug ON services(slug) WHERE slug IS NOT NULL;
GO

-- ----------------------------------------------------------------------------
-- 9. service_registrations — bệnh nhân đăng ký 1 buổi dịch vụ chăm sóc (UC-46)
-- ----------------------------------------------------------------------------
CREATE TABLE service_registrations (
    id                BIGINT          NOT NULL IDENTITY(1,1),
    service_id        BIGINT          NOT NULL,
    patient_id        BIGINT          NOT NULL,
    registered_by     BIGINT          NOT NULL,
    registration_date DATE            NULL,
    status            NVARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    notes             NVARCHAR(500)   NULL,
    created_at        DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_service_registrations PRIMARY KEY (id),
    CONSTRAINT FK_service_registrations_service FOREIGN KEY (service_id) REFERENCES services(id),
    CONSTRAINT FK_service_registrations_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT FK_service_registrations_registered_by FOREIGN KEY (registered_by) REFERENCES users(id),
    CONSTRAINT CK_service_registrations_status CHECK (status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'))
);
GO

-- ----------------------------------------------------------------------------
-- 10. discount_campaigns — chương trình giảm giá / voucher (UC-42)
-- ----------------------------------------------------------------------------
CREATE TABLE discount_campaigns (
    id                  BIGINT          NOT NULL IDENTITY(1,1),
    name                NVARCHAR(200)   NOT NULL,
    description         NVARCHAR(500)   NULL,
    type                NVARCHAR(20)    NOT NULL,
    value               DECIMAL(18,2)   NOT NULL,
    voucher_code        NVARCHAR(50)    NULL,
    valid_from          DATE            NOT NULL,
    valid_to            DATE            NOT NULL,
    min_purchase_amount DECIMAL(18,2)   NULL,
    max_usage_count     INT             NULL,
    used_count          INT             NOT NULL DEFAULT 0,
    is_active           BIT             NOT NULL DEFAULT 1,
    created_at          DATETIME2       NULL,
    updated_at          DATETIME2       NULL,
    CONSTRAINT PK_discount_campaigns PRIMARY KEY (id),
    CONSTRAINT CK_discount_campaigns_type CHECK (type IN ('PERCENTAGE', 'FIXED_AMOUNT', 'VOUCHER'))
);
GO
CREATE UNIQUE INDEX UQ_discount_campaigns_voucher ON discount_campaigns(voucher_code) WHERE voucher_code IS NOT NULL;
GO

-- ----------------------------------------------------------------------------
-- 11. patient_service_subscriptions — gói dịch vụ nhiều buổi bệnh nhân đã mua
-- (trừ buổi ngay khi đặt lịch — deduct-at-booking)
-- ----------------------------------------------------------------------------
CREATE TABLE patient_service_subscriptions (
    id              BIGINT          NOT NULL IDENTITY(1,1),
    patient_id      BIGINT          NOT NULL,
    service_id      BIGINT          NOT NULL,
    total_sessions  INT             NOT NULL,
    used_sessions   INT             NOT NULL DEFAULT 0,
    purchase_date   DATE            NOT NULL,
    expiry_date     DATE            NULL,
    status          NVARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    discount_id     BIGINT          NULL,
    final_price     DECIMAL(18,2)   NULL,
    notes           NVARCHAR(500)   NULL,
    created_at      DATETIME2       NULL,
    updated_at      DATETIME2       NULL,
    CONSTRAINT PK_patient_service_subscriptions PRIMARY KEY (id),
    CONSTRAINT FK_pat_sub_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT FK_pat_sub_service FOREIGN KEY (service_id) REFERENCES services(id),
    CONSTRAINT FK_pat_sub_discount FOREIGN KEY (discount_id) REFERENCES discount_campaigns(id),
    CONSTRAINT CK_pat_sub_status CHECK (status IN ('ACTIVE', 'EXPIRED', 'DEPLETED', 'CANCELLED'))
);
GO

-- ----------------------------------------------------------------------------
-- 12. care_sessions — từng buổi chăm sóc trong 1 gói đã mua
-- nurse_id → users (điều dưỡng phụ trách buổi chăm sóc)
-- ----------------------------------------------------------------------------
CREATE TABLE care_sessions (
    id                  BIGINT          NOT NULL IDENTITY(1,1),
    subscription_id     BIGINT          NOT NULL,
    patient_id          BIGINT          NOT NULL,
    nurse_id            BIGINT          NULL,
    scheduled_date_time DATETIME2       NOT NULL,
    status              NVARCHAR(20)    NOT NULL DEFAULT 'BOOKED',
    session_number      INT             NULL,
    notes               NVARCHAR(500)   NULL,
    nurse_notes         NVARCHAR(1000)  NULL,
    completed_at        DATETIME2       NULL,
    assigned_at         DATETIME2       NULL,
    created_at          DATETIME2       NULL,
    updated_at          DATETIME2       NULL,
    CONSTRAINT PK_care_sessions PRIMARY KEY (id),
    CONSTRAINT FK_care_sessions_subscription FOREIGN KEY (subscription_id) REFERENCES patient_service_subscriptions(id),
    CONSTRAINT FK_care_sessions_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT FK_care_sessions_nurse FOREIGN KEY (nurse_id) REFERENCES users(id),
    CONSTRAINT CK_care_sessions_status CHECK (status IN ('BOOKED', 'IN_PROGRESS', 'COMPLETED', 'CHECKED_OUT', 'CANCELLED'))
);
GO

-- ----------------------------------------------------------------------------
-- 13. appointments — lịch hẹn khám
-- booked_by: user_id người ĐẶT lịch (đặt hộ người thân: patient là người thân,
--            booked_by là tài khoản người đặt)
-- ----------------------------------------------------------------------------
CREATE TABLE appointments (
    id               BIGINT          NOT NULL IDENTITY(1,1),
    patient_id       BIGINT          NOT NULL,
    doctor_id        BIGINT          NULL,
    service_id       BIGINT          NULL,
    appointment_time DATETIME2       NOT NULL,
    time_slot        NVARCHAR(100)   NULL,
    type             NVARCHAR(20)    NULL,
    status           NVARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    notes            NVARCHAR(MAX)   NULL,
    queue_number     INT             NULL,
    check_in_time    DATETIME2       NULL,
    check_in_by      BIGINT          NULL,
    booked_by        BIGINT          NULL,
    reminder_sent    BIT             NOT NULL DEFAULT 0,
    cancel_reason    NVARCHAR(MAX)   NULL,
    cancelled_by     BIGINT          NULL,
    cancelled_at     DATETIME2       NULL,
    created_at       DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at       DATETIME2       NULL,
    CONSTRAINT PK_appointments PRIMARY KEY (id),
    CONSTRAINT FK_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT FK_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    CONSTRAINT FK_appointments_service FOREIGN KEY (service_id) REFERENCES services(id),
    CONSTRAINT FK_appointments_check_in_by FOREIGN KEY (check_in_by) REFERENCES users(id),
    CONSTRAINT FK_appointments_booked_by FOREIGN KEY (booked_by) REFERENCES users(id),
    CONSTRAINT FK_appointments_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id),
    CONSTRAINT CK_appointments_type CHECK (type IN ('ONLINE', 'WALK_IN')),
    CONSTRAINT CK_appointments_status CHECK (status IN ('PENDING', 'CONFIRMED', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
);
GO

-- ----------------------------------------------------------------------------
-- 14. medical_records — hồ sơ bệnh án (EMR), 1-1 với appointment
-- Các cột va/bcva/sph/cyl/axis/iop: chỉ số 2 mắt trái (_l) / phải (_r)
-- ----------------------------------------------------------------------------
CREATE TABLE medical_records (
    id               BIGINT          NOT NULL IDENTITY(1,1),
    appointment_id   BIGINT          NOT NULL,
    patient_id       BIGINT          NOT NULL,
    doctor_id        BIGINT          NOT NULL,
    chief_complaint  NVARCHAR(MAX)   NULL,
    symptoms         NVARCHAR(MAX)   NULL,
    diagnosis        NVARCHAR(MAX)   NULL,
    treatment_plan   NVARCHAR(MAX)   NULL,
    notes            NVARCHAR(MAX)   NULL,
    va_l             DECIMAL(4,2)    NULL,
    va_r             DECIMAL(4,2)    NULL,
    bcva_l           DECIMAL(4,2)    NULL,
    bcva_r           DECIMAL(4,2)    NULL,
    sph_l            DECIMAL(5,2)    NULL,
    cyl_l            DECIMAL(5,2)    NULL,
    axis_l           SMALLINT        NULL,
    iop_l            DECIMAL(4,1)    NULL,
    sph_r            DECIMAL(5,2)    NULL,
    cyl_r            DECIMAL(5,2)    NULL,
    axis_r           SMALLINT        NULL,
    iop_r            DECIMAL(4,1)    NULL,
    lab_image_url    NVARCHAR(MAX)   NULL,
    total_amount     DECIMAL(10,2)   NULL,
    locked_at        DATETIME2       NULL,
    locked_by        BIGINT          NULL,
    status           NVARCHAR(20)    NOT NULL DEFAULT 'DRAFT',
    created_at       DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at       DATETIME2       NULL,
    CONSTRAINT PK_medical_records PRIMARY KEY (id),
    CONSTRAINT UQ_medical_records_appointment UNIQUE (appointment_id),
    CONSTRAINT FK_medical_records_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    CONSTRAINT FK_medical_records_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT FK_medical_records_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    CONSTRAINT FK_medical_records_locked_by FOREIGN KEY (locked_by) REFERENCES users(id),
    CONSTRAINT CK_medical_records_status CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED'))
);
GO

-- ----------------------------------------------------------------------------
-- 15. medicines — danh mục thuốc
-- ----------------------------------------------------------------------------
CREATE TABLE medicines (
    id          BIGINT          NOT NULL IDENTITY(1,1),
    name        NVARCHAR(255)   NOT NULL,
    dosage_form NVARCHAR(50)    NULL,
    unit        NVARCHAR(100)   NOT NULL,
    unit_price  DECIMAL(10,2)   NULL,
    created_at  DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at  DATETIME2       NULL,
    CONSTRAINT PK_medicines PRIMARY KEY (id),
    CONSTRAINT CK_medicines_dosage_form CHECK (dosage_form IN ('TABLET', 'CAPSULE', 'LIQUID', 'DROP', 'INJECTION', 'OINTMENT', 'OTHER'))
);
GO

-- ----------------------------------------------------------------------------
-- 16. prescriptions — đơn thuốc (gắn với hồ sơ bệnh án)
-- ----------------------------------------------------------------------------
CREATE TABLE prescriptions (
    id                BIGINT          NOT NULL IDENTITY(1,1),
    medical_record_id BIGINT          NOT NULL,
    doctor_id         BIGINT          NOT NULL,
    patient_id        BIGINT          NOT NULL,
    status            NVARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    notes             NVARCHAR(500)   NULL,
    created_at        DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at        DATETIME2       NULL,
    CONSTRAINT PK_prescriptions PRIMARY KEY (id),
    CONSTRAINT FK_prescriptions_medical_record FOREIGN KEY (medical_record_id) REFERENCES medical_records(id),
    CONSTRAINT FK_prescriptions_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    CONSTRAINT FK_prescriptions_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT CK_prescriptions_status CHECK (status IN ('PENDING', 'DISPENSED', 'SKIPPED'))
);
GO

-- ----------------------------------------------------------------------------
-- 17. prescription_items — từng dòng thuốc trong đơn
-- ----------------------------------------------------------------------------
CREATE TABLE prescription_items (
    id              BIGINT          NOT NULL IDENTITY(1,1),
    prescription_id BIGINT          NOT NULL,
    medicine_id     BIGINT          NOT NULL,
    quantity        INT             NOT NULL,
    dosage          NVARCHAR(50)    NOT NULL,
    frequency       NVARCHAR(50)    NOT NULL,
    duration        INT             NOT NULL,
    instructions    NVARCHAR(200)   NULL,
    unit_price      DECIMAL(10,2)   NULL,
    CONSTRAINT PK_prescription_items PRIMARY KEY (id),
    CONSTRAINT FK_prescription_items_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
    CONSTRAINT FK_prescription_items_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id)
);
GO

-- ----------------------------------------------------------------------------
-- 18. eyeglass_prescriptions — đơn kính (OD = mắt phải, OS = mắt trái)
-- ----------------------------------------------------------------------------
CREATE TABLE eyeglass_prescriptions (
    id                BIGINT          NOT NULL IDENTITY(1,1),
    medical_record_id BIGINT          NOT NULL,
    doctor_id         BIGINT          NOT NULL,
    patient_id        BIGINT          NOT NULL,
    od_sph            DECIMAL(5,2)    NULL,
    od_cyl            DECIMAL(5,2)    NULL,
    od_axis           INT             NULL,
    od_add            DECIMAL(5,2)    NULL,
    os_sph            DECIMAL(5,2)    NULL,
    os_cyl            DECIMAL(5,2)    NULL,
    os_axis           INT             NULL,
    os_add            DECIMAL(5,2)    NULL,
    pd                DECIMAL(5,2)    NULL,
    lens_type         NVARCHAR(255)   NULL,
    notes             NVARCHAR(500)   NULL,
    status            NVARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    created_at        DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at        DATETIME2       NULL,
    CONSTRAINT PK_eyeglass_prescriptions PRIMARY KEY (id),
    CONSTRAINT FK_eyeglass_prescriptions_medical_record FOREIGN KEY (medical_record_id) REFERENCES medical_records(id),
    CONSTRAINT FK_eyeglass_prescriptions_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    CONSTRAINT FK_eyeglass_prescriptions_patient FOREIGN KEY (patient_id) REFERENCES patients(id)
);
GO

-- ----------------------------------------------------------------------------
-- 19. lab_orders — đơn xét nghiệm
-- LƯU Ý: ordered_by → doctors(id), assigned_to → lab_technicians(id)
-- (schema cũ trỏ users(id) — đã đổi theo entity LabOrder hiện tại)
-- ----------------------------------------------------------------------------
CREATE TABLE lab_orders (
    id                BIGINT          NOT NULL IDENTITY(1,1),
    medical_record_id BIGINT          NOT NULL,
    ordered_by        BIGINT          NULL,
    assigned_to       BIGINT          NULL,
    notes             NVARCHAR(MAX)   NULL,
    priority          NVARCHAR(20)    NOT NULL CONSTRAINT DF_lab_orders_priority DEFAULT 'PRIMARY',
    status            NVARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    completed_at      DATETIME2       NULL,
    rejection_reason  NVARCHAR(MAX)   NULL,
    rejected_at       DATETIME2       NULL,
    created_at        DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at        DATETIME2       NULL,
    CONSTRAINT PK_lab_orders PRIMARY KEY (id),
    CONSTRAINT FK_lab_orders_medical_record FOREIGN KEY (medical_record_id) REFERENCES medical_records(id),
    CONSTRAINT FK_lab_orders_ordered_by FOREIGN KEY (ordered_by) REFERENCES doctors(id),
    CONSTRAINT FK_lab_orders_assigned_to FOREIGN KEY (assigned_to) REFERENCES lab_technicians(id),
    CONSTRAINT CK_lab_orders_priority CHECK (priority IN ('PRIMARY', 'WARNING', 'EMERGENCY')),
    CONSTRAINT CK_lab_orders_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'REJECTED', 'APPROVED'))
);
GO

-- ----------------------------------------------------------------------------
-- 20. lab_results — kết quả xét nghiệm (1-1 với lab_orders)
-- uploaded_by → lab_technicians(id), reviewed_by → doctors(id)
-- Trạng thái "đã review chưa" suy ra từ reviewed_at (NULL = chưa)
-- ----------------------------------------------------------------------------
CREATE TABLE lab_results (
    id           BIGINT          NOT NULL IDENTITY(1,1),
    lab_order_id BIGINT          NOT NULL,
    va_l         DECIMAL(4,2)    NULL,
    va_r         DECIMAL(4,2)    NULL,
    bcva_l       DECIMAL(4,2)    NULL,
    bcva_r       DECIMAL(4,2)    NULL,
    sph_l        DECIMAL(5,2)    NULL,
    cyl_l        DECIMAL(5,2)    NULL,
    axis_l       INT             NULL,
    iop_l        DECIMAL(4,1)    NULL,
    sph_r        DECIMAL(5,2)    NULL,
    cyl_r        DECIMAL(5,2)    NULL,
    axis_r       INT             NULL,
    iop_r        DECIMAL(4,1)    NULL,
    image_url    NVARCHAR(MAX)   NULL,
    doctor_notes NVARCHAR(MAX)   NULL,
    uploaded_by  BIGINT          NOT NULL,
    reviewed_by  BIGINT          NOT NULL,
    reviewed_at  DATETIME2       NULL,
    created_at   DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at   DATETIME2       NULL,
    CONSTRAINT PK_lab_results PRIMARY KEY (id),
    CONSTRAINT UQ_lab_results_lab_order UNIQUE (lab_order_id),
    CONSTRAINT FK_lab_results_lab_order FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id),
    CONSTRAINT FK_lab_results_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES lab_technicians(id),
    CONSTRAINT FK_lab_results_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES doctors(id)
);
GO

-- ----------------------------------------------------------------------------
-- 21. invoices — hóa đơn (1 hóa đơn / 1 lịch hẹn)
-- service_fee/lab_fee/medicine_fee: tách chi phí theo nhóm để hiển thị
-- ----------------------------------------------------------------------------
CREATE TABLE invoices (
    id                 BIGINT          NOT NULL IDENTITY(1,1),
    appointment_id     BIGINT          NOT NULL,
    patient_id         BIGINT          NOT NULL,
    invoice_code       NVARCHAR(30)    NULL,
    service_fee        DECIMAL(12,2)   NULL,
    lab_fee            DECIMAL(12,2)   NULL,
    medicine_fee       DECIMAL(12,2)   NULL,
    sub_total          DECIMAL(12,2)   NOT NULL DEFAULT 0,
    discount_amount    DECIMAL(12,2)   NOT NULL DEFAULT 0,
    tax                DECIMAL(12,2)   NOT NULL DEFAULT 0,
    total_amount       DECIMAL(12,2)   NOT NULL DEFAULT 0,
    payment_method     NVARCHAR(20)    NULL,
    payment_reference  NVARCHAR(100)   NULL,
    payment_status     NVARCHAR(20)    NOT NULL DEFAULT 'UNPAID',
    pdf_url            NVARCHAR(500)   NULL,
    notes              NVARCHAR(MAX)   NULL,
    issued_by          BIGINT          NULL,
    generated_at       DATETIME2       NULL,
    paid_at            DATETIME2       NULL,
    status             NVARCHAR(20)    NOT NULL DEFAULT 'DRAFT',
    created_at         DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at         DATETIME2       NULL,
    CONSTRAINT PK_invoices PRIMARY KEY (id),
    CONSTRAINT FK_invoices_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    CONSTRAINT FK_invoices_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT FK_invoices_issued_by FOREIGN KEY (issued_by) REFERENCES users(id),
    CONSTRAINT CK_invoices_payment_method CHECK (payment_method IN ('CASH', 'VIET_QR', 'OTHER')),
    CONSTRAINT CK_invoices_payment_status CHECK (payment_status IN ('UNPAID', 'PENDING_PAYMENT', 'PAID', 'PAYMENT_FAILED')),
    CONSTRAINT CK_invoices_status CHECK (status IN ('DRAFT', 'ISSUED', 'CANCELLED'))
);
GO
CREATE UNIQUE INDEX UQ_invoices_invoice_code ON invoices(invoice_code) WHERE invoice_code IS NOT NULL;
GO

-- ----------------------------------------------------------------------------
-- 22. invoice_details — dòng chi tiết trong hóa đơn
-- ref_id: id của service/medicine/prescription tương ứng theo item_type
-- ----------------------------------------------------------------------------
CREATE TABLE invoice_details (
    id          BIGINT          NOT NULL IDENTITY(1,1),
    invoice_id  BIGINT          NOT NULL,
    item_type   NVARCHAR(20)    NOT NULL,
    ref_id      BIGINT          NULL,
    description NVARCHAR(500)   NOT NULL,
    quantity    INT             NOT NULL DEFAULT 1,
    unit_price  DECIMAL(12,2)   NOT NULL,
    sub_total   DECIMAL(12,2)   NOT NULL,
    status      NVARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    created_at  DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_invoice_details PRIMARY KEY (id),
    CONSTRAINT FK_invoice_details_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    CONSTRAINT CK_invoice_details_item_type CHECK (item_type IN ('SERVICE', 'MEDICINE', 'GLASSES', 'OTHER')),
    CONSTRAINT CK_invoice_details_status CHECK (status IN ('ACTIVE', 'CANCELLED'))
);
GO

-- ----------------------------------------------------------------------------
-- 23. notifications — thông báo ở chuông (UC-13), tách biệt audit_logs
-- target_user_id: nhắm riêng 1 user; target_role: broadcast theo vai trò
-- ----------------------------------------------------------------------------
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
CREATE INDEX IX_notifications_role_read ON notifications (target_role, is_read);
CREATE INDEX IX_notifications_user_read ON notifications (target_user_id, is_read);
GO

-- ----------------------------------------------------------------------------
-- 24. blog_posts — bài viết blog/tin tức
-- ----------------------------------------------------------------------------
CREATE TABLE blog_posts (
    id            BIGINT          NOT NULL IDENTITY(1,1),
    title         NVARCHAR(255)   NOT NULL,
    slug          NVARCHAR(255)   NOT NULL,
    content       NVARCHAR(MAX)   NOT NULL,
    thumbnail_url NVARCHAR(500)   NULL,
    author_id     BIGINT          NOT NULL,
    status        NVARCHAR(20)    NOT NULL DEFAULT 'DRAFT',
    published_at  DATETIME2       NULL,
    created_at    DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at    DATETIME2       NULL,
    CONSTRAINT PK_blog_posts PRIMARY KEY (id),
    CONSTRAINT UQ_blog_posts_slug UNIQUE (slug),
    CONSTRAINT FK_blog_posts_author FOREIGN KEY (author_id) REFERENCES users(id),
    CONSTRAINT CK_blog_posts_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);
GO

-- ----------------------------------------------------------------------------
-- 25. audit_logs — nhật ký hành động (UC-57, append-only)
-- entity_id là chuỗi (khớp entity AuditLog), không phải BIGINT
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id          BIGINT          NOT NULL IDENTITY(1,1),
    user_id     BIGINT          NULL,
    action      NVARCHAR(100)   NOT NULL,
    entity_type NVARCHAR(100)   NULL,
    entity_id   NVARCHAR(100)   NULL,
    old_value   NVARCHAR(MAX)   NULL,
    new_value   NVARCHAR(MAX)   NULL,
    ip_address  NVARCHAR(64)    NULL,
    created_at  DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_audit_logs PRIMARY KEY (id),
    CONSTRAINT FK_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
);
GO

-- (UC-57) Bảo vệ append-only ở mức DB cho môi trường production:
-- tạo login riêng cho ứng dụng (không dùng sa) rồi chạy:
--   REVOKE UPDATE, DELETE ON dbo.audit_logs FROM [<APP_DB_USER>];
--   GRANT  INSERT, SELECT  ON dbo.audit_logs TO   [<APP_DB_USER>];

-- ----------------------------------------------------------------------------
-- 26. system_configs — tham số cấu hình hệ thống (UC-56)
-- ----------------------------------------------------------------------------
CREATE TABLE system_configs (
    id           BIGINT          NOT NULL IDENTITY(1,1),
    config_key   NVARCHAR(100)   NOT NULL,
    config_value NVARCHAR(MAX)   NOT NULL,
    data_type    NVARCHAR(20)    NOT NULL DEFAULT 'STRING',
    description  NVARCHAR(MAX)   NULL,
    updated_by   BIGINT          NULL,
    updated_at   DATETIME2       NULL,
    CONSTRAINT PK_system_configs PRIMARY KEY (id),
    CONSTRAINT UQ_system_configs_key UNIQUE (config_key),
    CONSTRAINT FK_system_configs_updated_by FOREIGN KEY (updated_by) REFERENCES users(id),
    CONSTRAINT CK_system_configs_data_type CHECK (data_type IN ('STRING', 'INTEGER', 'BIT', 'JSON'))
);
GO

-- ----------------------------------------------------------------------------
-- 27. notification_templates — mẫu nội dung email/SMS/in-app (UC-56)
-- "Xóa" template = set is_active = 0 (BR-09), không hard delete
-- ----------------------------------------------------------------------------
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
GO

-- ============================================================================
-- PHẦN 2 — BẢNG DỰ PHÒNG (backend hiện CHƯA có entity dùng tới; giữ lại vì
-- đã có class placeholder DoctorSchedule.java / Feedback.java và bảng staffs
-- phục vụ hồ sơ nhân sự chung. Xóa được nếu chắc chắn không làm các UC này.)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 28. staffs — hồ sơ nhân sự CHUNG cho nhân viên không có bảng chuyên môn riêng
-- (lễ tân, dược sĩ, điều dưỡng, quản lý…). KHÔNG tách bảng theo từng vai trò —
-- chỉ vai trò có thuộc tính chuyên môn riêng mới có bảng riêng (doctors,
-- lab_technicians). Quyền hạn đã quyết định bởi users.role_id.
-- ----------------------------------------------------------------------------
CREATE TABLE staffs (
    id            BIGINT          NOT NULL IDENTITY(1,1),
    user_id       BIGINT          NOT NULL,
    employee_code NVARCHAR(20)    NOT NULL,
    full_name     NVARCHAR(255)   NOT NULL,
    department    NVARCHAR(100)   NULL,
    position      NVARCHAR(100)   NOT NULL,
    phone_number  NVARCHAR(15)    NULL,
    hire_date     DATE            NULL,
    status        NVARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    created_at    DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at    DATETIME2       NULL,
    CONSTRAINT PK_staffs PRIMARY KEY (id),
    CONSTRAINT UQ_staffs_user_id UNIQUE (user_id),
    CONSTRAINT UQ_staffs_employee_code UNIQUE (employee_code),
    CONSTRAINT FK_staffs_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT CK_staffs_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
GO

-- ----------------------------------------------------------------------------
-- 29. doctor_schedules — ca làm việc của bác sĩ
-- ----------------------------------------------------------------------------
CREATE TABLE doctor_schedules (
    id          BIGINT          NOT NULL IDENTITY(1,1),
    doctor_id   BIGINT          NOT NULL,
    work_date   DATE            NOT NULL,
    slot_start  TIME            NOT NULL,
    slot_end    TIME            NOT NULL,
    max_slot    TINYINT         NOT NULL,
    booked_slot TINYINT         NOT NULL DEFAULT 0,
    status      NVARCHAR(20)    NOT NULL DEFAULT 'AVAILABLE',
    created_at  DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at  DATETIME2       NULL,
    CONSTRAINT PK_doctor_schedules PRIMARY KEY (id),
    CONSTRAINT FK_doctor_schedules_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    CONSTRAINT CK_doctor_schedules_status CHECK (status IN ('AVAILABLE', 'FULL', 'CANCELLED'))
);
GO

-- ----------------------------------------------------------------------------
-- 30. feedbacks — đánh giá của bệnh nhân sau buổi khám
-- ----------------------------------------------------------------------------
CREATE TABLE feedbacks (
    id             BIGINT          NOT NULL IDENTITY(1,1),
    patient_id     BIGINT          NOT NULL,
    appointment_id BIGINT          NOT NULL,
    doctor_id      BIGINT          NULL,
    rating         TINYINT         NOT NULL,
    content        NVARCHAR(MAX)   NULL,
    is_anonymous   BIT             NOT NULL DEFAULT 0,
    status         NVARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    created_at     DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_feedbacks PRIMARY KEY (id),
    CONSTRAINT FK_feedbacks_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT FK_feedbacks_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    CONSTRAINT FK_feedbacks_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    CONSTRAINT CK_feedbacks_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT CK_feedbacks_status CHECK (status IN ('PENDING', 'APPROVED', 'HIDDEN'))
);
GO

-- ============================================================================
-- PHẦN 3 — DỮ LIỆU CẤU HÌNH MẶC ĐỊNH (bắt buộc để app chạy)
-- ============================================================================

-- Roles (id tự tăng theo đúng thứ tự: ADMIN=1, MANAGER=2, DOCTOR=3,
-- RECEPTIONIST=4, PHARMACIST=5, LAB_TECHNICIAN=6, NURSE=7, PATIENT=8)
INSERT INTO roles (role_name, description) VALUES
    ('ADMIN',          N'Quản trị viên hệ thống'),
    ('MANAGER',        N'Quản lý phòng khám'),
    ('DOCTOR',         N'Bác sĩ'),
    ('RECEPTIONIST',   N'Lễ tân'),
    ('PHARMACIST',     N'Dược sĩ'),
    ('LAB_TECHNICIAN', N'Kỹ thuật viên xét nghiệm'),
    ('NURSE',          N'Điều dưỡng'),
    ('PATIENT',        N'Bệnh nhân');
GO

-- Tham số hệ thống (UC-56)
INSERT INTO system_configs (config_key, config_value, data_type, description) VALUES
    ('MAX_APPOINTMENTS_PER_DAY',  '30',        'INTEGER', N'Số lịch hẹn tối đa mỗi bác sĩ mỗi ngày (BR-03)'),
    ('MIN_BOOKING_HOURS_AHEAD',   '2',         'INTEGER', N'Đặt lịch trước ít nhất bao nhiêu giờ (BR-04)'),
    ('MIN_CANCEL_HOURS_AHEAD',    '1',         'INTEGER', N'Hủy lịch trước ít nhất bao nhiêu giờ (BR-05)'),
    ('MAX_FAILED_LOGIN_ATTEMPTS', '5',         'INTEGER', N'Số lần đăng nhập sai tối đa trước khi khóa (BR-02)'),
    ('ACCOUNT_LOCK_DURATION_MIN', '30',        'INTEGER', N'Thời gian khóa tài khoản (phút) (BR-02)'),
    ('JWT_ACCESS_EXPIRY_MS',      '3600000',   'INTEGER', N'JWT Access Token hết hạn sau (ms)'),
    ('JWT_REFRESH_EXPIRY_MS',     '604800000', 'INTEGER', N'JWT Refresh Token hết hạn sau (ms)'),
    ('CLINIC_NAME',               N'ECMS Clinic',     'STRING', N'Tên phòng khám'),
    ('CLINIC_PHONE',              N'0000000000',      'STRING', N'Số điện thoại liên hệ của phòng khám'),
    ('CLINIC_ADDRESS',            N'',                'STRING', N'Địa chỉ phòng khám'),
    ('CLINIC_HOURS',              N'08:00 - 17:00',   'STRING', N'Giờ làm việc của phòng khám');
GO

-- Mẫu thông báo (UC-56)
INSERT INTO notification_templates (template_key, channel, subject, body, variables_hint, is_active) VALUES
    ('APPOINTMENT_REMINDER_EMAIL', 'EMAIL',
     N'Nhắc lịch khám tại {{clinic_name}}',
     N'Xin chào {{patient_name}}, bạn có lịch khám vào lúc {{appointment_time}} với {{doctor_name}}. Vui lòng đến trước 15 phút để làm thủ tục.',
     N'{{clinic_name}}, {{patient_name}}, {{appointment_time}}, {{doctor_name}}', 1),
    ('APPOINTMENT_REMINDER_IN_APP', 'IN_APP',
     NULL,
     N'Bạn có lịch khám sắp tới lúc {{appointment_time}}. Nhấn để xem chi tiết.',
     N'{{appointment_time}}', 1);
GO

PRINT N'';
PRINT N'✅ ECMS schema hoàn tất: 30 bảng (27 bảng backend đang dùng + 3 bảng dự phòng)';
PRINT N'   + seed roles (8), system_configs (11), notification_templates (2).';
PRINT N'👉 Tiếp theo hãy chạy ecms_data_seed.sql để có dữ liệu demo & tài khoản đăng nhập.';
GO
