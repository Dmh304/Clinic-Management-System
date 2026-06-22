-- ============================================================
-- ECMS — Eyes Clinic Management System
-- SQL Server Schema Script (đã gộp toàn bộ migration/fix)
-- Chạy script này trong SSMS sau khi đã tạo database ecms_db
-- Thứ tự tạo bảng đã được sắp xếp đúng theo FK dependency
-- ============================================================

USE ecms_db;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================
-- 1. roles
-- ============================================================
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

-- ============================================================
-- 2. users
-- ============================================================
CREATE TABLE users (
    id                  BIGINT          NOT NULL IDENTITY(1,1),
    email               NVARCHAR(255)   NOT NULL,
    password            NVARCHAR(255)   NULL,
    full_name           NVARCHAR(255)   NOT NULL,
    phone_number        NVARCHAR(15)    NULL,
    date_of_birth       DATE            NULL,
    gender              NVARCHAR(20)    NULL,
    address             NVARCHAR(MAX)   NULL,
    avatar_url          NVARCHAR(500)   NULL,
    google_id           NVARCHAR(255)   NULL,
    email_verified_at   DATETIME2       NULL,
    failed_login_count  TINYINT         NOT NULL DEFAULT 0,
    locked_until        DATETIME2       NULL,
    last_login_at       DATETIME2       NULL,
    status              NVARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    enabled             BIT             NOT NULL DEFAULT 1,
    role_id             BIGINT          NOT NULL,
    created_at          DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at          DATETIME2       NULL,
    CONSTRAINT PK_users PRIMARY KEY (id),
    CONSTRAINT UQ_users_email UNIQUE (email),
    CONSTRAINT FK_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
    CONSTRAINT CK_users_gender CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    CONSTRAINT CK_users_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'LOCKED'))
);
GO
-- Filtered index: SQL Server chỉ cho phép 1 NULL với UNIQUE constraint thường,
-- dùng filtered index để cho phép nhiều user không có google_id (đăng nhập thường).
CREATE UNIQUE INDEX UX_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
GO

-- ============================================================
-- 3. service_registrations
-- (Thay cho bảng user_roles đã loại bỏ — phân quyền của mỗi user
--  dùng MỘT role/user qua cột users.role_id ở mục 2, không dùng
--  mô hình N-N. Không có entity/repository nào trong backend tham
--  chiếu tới user_roles; giữ cả hai sẽ tạo ra hai nguồn sự thật
--  mâu thuẫn nhau về quyền của user.)
--
-- service_registrations cần FK tới services và patients, nên CREATE
-- TABLE thật được đặt ở dưới — ngay sau mục 11 "services" (xem mục
-- "3 (tiếp)" trước mục 12 "appointments") để giữ đúng thứ tự FK
-- dependency của toàn script. Mục số vẫn giữ là 3 để dễ theo dõi,
-- không đánh số lại các mục phía sau.
-- ============================================================

-- ============================================================
-- 4. refresh_tokens
-- ============================================================
CREATE TABLE refresh_tokens (
    id          BIGINT          NOT NULL IDENTITY(1,1),
    user_id     BIGINT          NOT NULL,
    token_hash  NVARCHAR(512)   NOT NULL,
    device_info NVARCHAR(255)   NULL,
    expires_at  DATETIME2       NOT NULL,
    revoked_at  DATETIME2       NULL,
    created_at  DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_refresh_tokens PRIMARY KEY (id),
    CONSTRAINT UQ_refresh_tokens_token_hash UNIQUE (token_hash),
    CONSTRAINT FK_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
);
GO

-- ============================================================
-- 5. password_reset_tokens
-- ============================================================
CREATE TABLE password_reset_tokens (
    id          BIGINT          NOT NULL IDENTITY(1,1),
    user_id     BIGINT          NOT NULL,
    token_hash  NVARCHAR(512)   NOT NULL,
    type        NVARCHAR(20)    NOT NULL,
    expires_at  DATETIME2       NOT NULL,
    used_at     DATETIME2       NULL,
    created_at  DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_password_reset_tokens PRIMARY KEY (id),
    CONSTRAINT UQ_password_reset_tokens_hash UNIQUE (token_hash),
    CONSTRAINT FK_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT CK_password_reset_tokens_type CHECK (type IN ('PASSWORD_RESET', 'EMAIL_VERIFY'))
);
GO

-- ============================================================
-- 6. patients
-- ============================================================
CREATE TABLE patients (
    id                      BIGINT          NOT NULL IDENTITY(1,1),
    user_id                 BIGINT          NULL,
    patient_code            NVARCHAR(20)    NULL,
    full_name               NVARCHAR(255)   NOT NULL,
    date_of_birth           DATE            NULL,
    gender                  NVARCHAR(20)    NULL,
    address                 NVARCHAR(MAX)   NULL,
    phone                   NVARCHAR(15)    NULL,
    email                   NVARCHAR(255)   NULL,
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
-- Filtered index: cho phép nhiều NULL (chưa có user account / patient_code / CCCD)
CREATE UNIQUE INDEX UQ_patients_user_id ON patients(user_id) WHERE user_id IS NOT NULL;
GO
CREATE UNIQUE INDEX UQ_patients_patient_code ON patients(patient_code) WHERE patient_code IS NOT NULL;
GO
CREATE UNIQUE INDEX UQ_patients_cccd ON patients(cccd) WHERE cccd IS NOT NULL;
GO

-- ============================================================
-- 7. doctors
-- ============================================================
CREATE TABLE doctors (
    id               BIGINT          NOT NULL IDENTITY(1,1),
    user_id          BIGINT          NOT NULL,
    doctor_code      NVARCHAR(20)    NOT NULL,
    full_name        NVARCHAR(255)   NOT NULL,
    license_number   NVARCHAR(100)   NOT NULL,
    specialty        NVARCHAR(100)   NOT NULL,
    department       NVARCHAR(100)   NULL,
    phone_number     NVARCHAR(15)    NULL,
    email            NVARCHAR(255)   NULL,
    experience_years TINYINT         NULL,
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

-- ============================================================
-- 8. staffs
-- ============================================================
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

-- ============================================================
-- 9. doctor_schedules
-- ============================================================
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

-- ============================================================
-- 10. service_categories
-- ============================================================
CREATE TABLE service_categories (
    id            BIGINT          NOT NULL IDENTITY(1,1),
    name          NVARCHAR(300)   NOT NULL,
    slug          NVARCHAR(200)   NULL,
    display_order INT             NOT NULL DEFAULT 0,
    CONSTRAINT PK_service_categories PRIMARY KEY (id),
    CONSTRAINT UQ_service_categories_slug UNIQUE (slug)
);
GO

-- ============================================================
-- 11. services
-- service_type: CLINICAL (khám/chẩn đoán — chỉ hiện ở lịch khám vãng lai)
--               CARE     (chăm sóc/thư giãn mắt — chỉ hiện ở trang dịch vụ công khai)
-- ============================================================
CREATE TABLE services (
    id                BIGINT          NOT NULL IDENTITY(1,1),
    name              NVARCHAR(255)   NOT NULL,
    category          NVARCHAR(100)   NULL,
    price             DECIMAL(10,2)   NOT NULL,
    duration_minutes  INT             NULL,
    thumbnail_url     NVARCHAR(500)   NULL,
    description       NVARCHAR(MAX)   NULL,
    status            NVARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    badge             NVARCHAR(50)    NULL,
    price_label       NVARCHAR(100)   NULL,
    sessions_included INT             NULL,
    validity_days     INT             NULL,
    service_type      NVARCHAR(20)    NOT NULL DEFAULT 'CARE',
    is_active         BIT             NOT NULL DEFAULT 1,
    display_order     INT             NOT NULL DEFAULT 0,
    category_id       BIGINT          NULL,
    slug              NVARCHAR(200)   NULL,
    content           NVARCHAR(MAX)   NULL,
    created_at        DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at        DATETIME2       NULL,
    CONSTRAINT PK_services PRIMARY KEY (id),
    CONSTRAINT FK_services_category FOREIGN KEY (category_id) REFERENCES service_categories(id),
    CONSTRAINT CK_services_status CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT CK_services_service_type CHECK (service_type IN ('CLINICAL', 'CARE'))
);
GO
-- Filtered index: cho phép nhiều dịch vụ không có slug (chỉ enforce unique khi có slug)
CREATE UNIQUE INDEX UQ_services_slug ON services(slug) WHERE slug IS NOT NULL;
GO

-- ============================================================
-- 3 (tiếp) — service_registrations
-- Đặt ở đây (sau patients + services) để đúng thứ tự FK dependency;
-- xem ghi chú ở mục 3 phía trên.
--
-- service_registrations: bệnh nhân đăng ký 1 dịch vụ chăm sóc mắt
-- (UC-46 Register for Eye Care Services) — khác với
-- patient_service_subscriptions (mua nguyên gói nhiều buổi).
-- ============================================================
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

-- ============================================================
-- 12. appointments
-- ============================================================
CREATE TABLE appointments (
    id               BIGINT          NOT NULL IDENTITY(1,1),
    patient_id       BIGINT          NOT NULL,
    doctor_id        BIGINT          NOT NULL,
    service_id       BIGINT          NULL,
    appointment_date DATE            NULL,
    appointment_time DATETIME2       NOT NULL,
    time_slot        NVARCHAR(100)   NULL,
    type             NVARCHAR(20)    NOT NULL,
    notes            NVARCHAR(MAX)   NULL,
    queue_number     INT             NULL,
    check_in_time    DATETIME2       NULL,
    check_in_by      BIGINT          NULL,
    reminder_sent    BIT             NOT NULL DEFAULT 0,
    cancel_reason    NVARCHAR(MAX)   NULL,
    cancelled_by     BIGINT          NULL,
    cancelled_at     DATETIME2       NULL,
    status           NVARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    created_at       DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at       DATETIME2       NULL,
    CONSTRAINT PK_appointments PRIMARY KEY (id),
    CONSTRAINT FK_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT FK_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    CONSTRAINT FK_appointments_service FOREIGN KEY (service_id) REFERENCES services(id),
    CONSTRAINT FK_appointments_check_in_by FOREIGN KEY (check_in_by) REFERENCES users(id),
    CONSTRAINT FK_appointments_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id),
    CONSTRAINT CK_appointments_type CHECK (type IN ('ONLINE', 'WALK_IN')),
    CONSTRAINT CK_appointments_status CHECK (status IN ('PENDING', 'CONFIRMED', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
);
GO

-- ============================================================
-- 13. medical_records
-- ============================================================
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
    image_url        NVARCHAR(500)   NULL,
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

-- ============================================================
-- 14. prescriptions
-- ============================================================
CREATE TABLE prescriptions (
    id                BIGINT          NOT NULL IDENTITY(1,1),
    medical_record_id BIGINT          NOT NULL,
    type              NVARCHAR(20)    NOT NULL,
    notes             NVARCHAR(MAX)   NULL,
    issued_by         BIGINT          NOT NULL,
    dispensed_by      BIGINT          NULL,
    dispensed_at      DATETIME2       NULL,
    status            NVARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    created_at        DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at        DATETIME2       NULL,
    CONSTRAINT PK_prescriptions PRIMARY KEY (id),
    CONSTRAINT FK_prescriptions_medical_record FOREIGN KEY (medical_record_id) REFERENCES medical_records(id),
    CONSTRAINT FK_prescriptions_issued_by FOREIGN KEY (issued_by) REFERENCES users(id),
    CONSTRAINT FK_prescriptions_dispensed_by FOREIGN KEY (dispensed_by) REFERENCES users(id),
    CONSTRAINT CK_prescriptions_type CHECK (type IN ('MEDICINE', 'GLASSES', 'BOTH')),
    CONSTRAINT CK_prescriptions_status CHECK (status IN ('PENDING', 'IN_PREPARATION', 'DISPENSED', 'SKIPPED'))
);
GO

-- ============================================================
-- 15. medicines
-- ============================================================
CREATE TABLE medicines (
    id                   BIGINT          NOT NULL IDENTITY(1,1),
    name                 NVARCHAR(255)   NOT NULL,
    unit                 NVARCHAR(50)    NOT NULL,
    dosage_form          NVARCHAR(50)    NOT NULL,
    category             NVARCHAR(100)   NULL,
    unit_price           DECIMAL(10,2)   NOT NULL,
    requires_prescription BIT            NOT NULL DEFAULT 1,
    description          NVARCHAR(MAX)   NULL,
    status               NVARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    created_at           DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at           DATETIME2       NULL,
    CONSTRAINT PK_medicines PRIMARY KEY (id),
    CONSTRAINT CK_medicines_dosage_form CHECK (dosage_form IN ('TABLET', 'CAPSULE', 'LIQUID', 'DROP', 'INJECTION', 'OINTMENT', 'OTHER')),
    CONSTRAINT CK_medicines_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
GO

-- ============================================================
-- 16. prescription_items
-- ============================================================
CREATE TABLE prescription_items (
    id                   BIGINT          NOT NULL IDENTITY(1,1),
    prescription_id      BIGINT          NOT NULL,
    medicine_id          BIGINT          NOT NULL,
    quantity             INT             NOT NULL,
    unit                 NVARCHAR(50)    NOT NULL,
    dosage_instruction   NVARCHAR(MAX)   NOT NULL,
    unit_price           DECIMAL(10,2)   NULL,
    status               NVARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    created_at           DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_prescription_items PRIMARY KEY (id),
    CONSTRAINT FK_prescription_items_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
    CONSTRAINT FK_prescription_items_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id),
    CONSTRAINT CK_prescription_items_status CHECK (status IN ('PENDING', 'DISPENSED', 'CANCELLED'))
);
GO

-- ============================================================
-- 17. glasses_orders
-- ============================================================
CREATE TABLE glasses_orders (
    id                BIGINT          NOT NULL IDENTITY(1,1),
    prescription_id   BIGINT          NOT NULL,
    frame_description NVARCHAR(MAX)   NULL,
    sph_r             DECIMAL(5,2)    NULL,
    cyl_r             DECIMAL(5,2)    NULL,
    axis_r            SMALLINT        NULL,
    sph_l             DECIMAL(5,2)    NULL,
    cyl_l             DECIMAL(5,2)    NULL,
    axis_l            SMALLINT        NULL,
    add_power         DECIMAL(4,2)    NULL,
    pd_right          DECIMAL(4,1)    NULL,
    pd_left           DECIMAL(4,1)    NULL,
    lens_type         NVARCHAR(100)   NULL,
    lens_coating      NVARCHAR(100)   NULL,
    dispensed_by      BIGINT          NULL,
    dispensed_at      DATETIME2       NULL,
    status            NVARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    created_at        DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at        DATETIME2       NULL,
    CONSTRAINT PK_glasses_orders PRIMARY KEY (id),
    CONSTRAINT FK_glasses_orders_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
    CONSTRAINT FK_glasses_orders_dispensed_by FOREIGN KEY (dispensed_by) REFERENCES users(id),
    CONSTRAINT CK_glasses_orders_status CHECK (status IN ('PENDING', 'IN_PRODUCTION', 'READY', 'DISPENSED', 'CANCELLED'))
);
GO

-- ============================================================
-- 18. lab_orders
-- ============================================================
CREATE TABLE lab_orders (
    id                BIGINT          NOT NULL IDENTITY(1,1),
    medical_record_id BIGINT          NOT NULL,
    ordered_by        BIGINT          NOT NULL,
    assigned_to       BIGINT          NULL,
    notes             NVARCHAR(MAX)   NULL,
    priority          NVARCHAR(20)    NOT NULL DEFAULT 'NORMAL',
    completed_at      DATETIME2       NULL,
    rejection_reason  NVARCHAR(MAX)   NULL,
    rejected_at       DATETIME2       NULL,
    status            NVARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    created_at        DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at        DATETIME2       NULL,
    CONSTRAINT PK_lab_orders PRIMARY KEY (id),
    CONSTRAINT FK_lab_orders_medical_record FOREIGN KEY (medical_record_id) REFERENCES medical_records(id),
    CONSTRAINT FK_lab_orders_ordered_by FOREIGN KEY (ordered_by) REFERENCES users(id),
    CONSTRAINT FK_lab_orders_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id),
    CONSTRAINT CK_lab_orders_priority CHECK (priority IN ('NORMAL', 'URGENT')),
    CONSTRAINT CK_lab_orders_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'))
);
GO

-- ============================================================
-- 19. lab_order_items
-- ============================================================
CREATE TABLE lab_order_items (
    id          BIGINT          NOT NULL IDENTITY(1,1),
    lab_order_id BIGINT         NOT NULL,
    service_id  BIGINT          NOT NULL,
    status      NVARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    result_id   BIGINT          NULL,
    created_at  DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_lab_order_items PRIMARY KEY (id),
    CONSTRAINT FK_lab_order_items_lab_order FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id),
    CONSTRAINT FK_lab_order_items_service FOREIGN KEY (service_id) REFERENCES services(id),
    CONSTRAINT CK_lab_order_items_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED'))
);
GO

-- ============================================================
-- 20. lab_results
-- ============================================================
-- result_data: vẫn giữ làm cột dữ liệu mở (JSON tự do) cho các xét nghiệm
-- không theo khuôn mắt trái/phải (xét nghiệm máu, OCT, Topo...). Các cột
-- va_*/bcva_*/sph_*/cyl_*/axis_*/iop_* dùng cho nhóm xét nghiệm khúc xạ/
-- thị lực/nhãn áp — cùng cấu trúc với medical_records để Doctor đối chiếu
-- dễ dàng giữa kết quả khám và kết quả lab.
-- status: đã bỏ — trạng thái "đã review hay chưa" suy ra từ reviewed_at
-- (NULL = chưa review). lab_order_items.status mới là nơi theo dõi vòng
-- đời PENDING/IN_PROGRESS/COMPLETED của từng xét nghiệm trong đơn.
CREATE TABLE lab_results (
    id           BIGINT          NOT NULL IDENTITY(1,1),
    lab_order_id BIGINT          NOT NULL,
    result_data  NVARCHAR(MAX)   NULL,
    va_l         DECIMAL(4,2)    NULL,
    va_r         DECIMAL(4,2)    NULL,
    bcva_l       DECIMAL(4,2)    NULL,
    bcva_r       DECIMAL(4,2)    NULL,
    sph_l        DECIMAL(5,2)    NULL,
    cyl_l        DECIMAL(5,2)    NULL,
    axis_l       SMALLINT        NULL,
    iop_l        DECIMAL(4,1)    NULL,
    sph_r        DECIMAL(5,2)    NULL,
    cyl_r        DECIMAL(5,2)    NULL,
    axis_r       SMALLINT        NULL,
    iop_r        DECIMAL(4,1)    NULL,
    image_url    NVARCHAR(500)   NULL,
    doctor_notes NVARCHAR(MAX)   NULL,
    uploaded_by  BIGINT          NOT NULL,
    reviewed_by  BIGINT          NULL,
    reviewed_at  DATETIME2       NULL,
    created_at   DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at   DATETIME2       NULL,
    CONSTRAINT PK_lab_results PRIMARY KEY (id),
    CONSTRAINT FK_lab_results_lab_order FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id),
    CONSTRAINT FK_lab_results_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id),
    CONSTRAINT FK_lab_results_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id)
);
GO

-- ============================================================
-- 21. service_assignments
-- ============================================================
CREATE TABLE service_assignments (
    id            BIGINT          NOT NULL IDENTITY(1,1),
    lab_result_id BIGINT          NOT NULL,
    service_id    BIGINT          NOT NULL,
    status        NVARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    created_at    DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_service_assignments PRIMARY KEY (id),
    CONSTRAINT FK_service_assignments_lab_result FOREIGN KEY (lab_result_id) REFERENCES lab_results(id),
    CONSTRAINT FK_service_assignments_service FOREIGN KEY (service_id) REFERENCES services(id),
    CONSTRAINT CK_service_assignments_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
GO

-- ============================================================
-- 22. invoices
-- ============================================================
CREATE TABLE invoices (
    id                 BIGINT          NOT NULL IDENTITY(1,1),
    appointment_id     BIGINT          NOT NULL,
    patient_id         BIGINT          NOT NULL,
    sub_total          DECIMAL(10,2)   NOT NULL DEFAULT 0,
    discount_amount    DECIMAL(10,2)   NOT NULL DEFAULT 0,
    tax                DECIMAL(10,2)   NOT NULL DEFAULT 0,
    total_amount       DECIMAL(10,2)   NOT NULL DEFAULT 0,
    payment_method     NVARCHAR(20)    NULL,
    payment_status     NVARCHAR(20)    NOT NULL DEFAULT 'UNPAID',
    payment_reference  NVARCHAR(255)   NULL,
    pdf_url            NVARCHAR(500)   NULL,
    issued_by          BIGINT          NULL,
    paid_at            DATETIME2       NULL,
    generated_at       DATETIME2       NULL,
    status             NVARCHAR(20)    NOT NULL DEFAULT 'DRAFT',
    created_at         DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at         DATETIME2       NULL,
    CONSTRAINT PK_invoices PRIMARY KEY (id),
    CONSTRAINT FK_invoices_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    CONSTRAINT FK_invoices_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT FK_invoices_issued_by FOREIGN KEY (issued_by) REFERENCES users(id),
    CONSTRAINT CK_invoices_payment_method CHECK (payment_method IN ('CASH', 'VIET_QR', 'OTHER')),
    CONSTRAINT CK_invoices_payment_status CHECK (payment_status IN ('UNPAID', 'PAID', 'PAYMENT_FAILED', 'PENDING_PAYMENT')),
    CONSTRAINT CK_invoices_status CHECK (status IN ('DRAFT', 'ISSUED', 'CANCELLED'))
);
GO

-- ============================================================
-- 23. invoice_details
-- ============================================================
CREATE TABLE invoice_details (
    id          BIGINT          NOT NULL IDENTITY(1,1),
    invoice_id  BIGINT          NOT NULL,
    item_type   NVARCHAR(20)    NOT NULL,
    description NVARCHAR(255)   NOT NULL,
    unit_price  DECIMAL(10,2)   NOT NULL,
    quantity    INT             NOT NULL DEFAULT 1,
    sub_total   DECIMAL(10,2)   NOT NULL,
    ref_id      BIGINT          NULL,
    status      NVARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    created_at  DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_invoice_details PRIMARY KEY (id),
    CONSTRAINT FK_invoice_details_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    CONSTRAINT CK_invoice_details_item_type CHECK (item_type IN ('SERVICE', 'MEDICINE', 'GLASSES', 'OTHER')),
    CONSTRAINT CK_invoice_details_status CHECK (status IN ('ACTIVE', 'CANCELLED'))
);
GO

-- ============================================================
-- 24. notifications
-- ============================================================
CREATE TABLE notifications (
    id          BIGINT          NOT NULL IDENTITY(1,1),
    user_id     BIGINT          NOT NULL,
    channel     NVARCHAR(20)    NOT NULL,
    subject     NVARCHAR(255)   NULL,
    body        NVARCHAR(MAX)   NOT NULL,
    ref_type    NVARCHAR(100)   NULL,
    ref_id      BIGINT          NULL,
    sent_status NVARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    sent_at     DATETIME2       NULL,
    is_read     BIT             NOT NULL DEFAULT 0,
    read_at     DATETIME2       NULL,
    created_at  DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_notifications PRIMARY KEY (id),
    CONSTRAINT FK_notifications_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT CK_notifications_channel CHECK (channel IN ('EMAIL', 'IN_APP', 'SMS')),
    CONSTRAINT CK_notifications_sent_status CHECK (sent_status IN ('PENDING', 'SENT', 'FAILED'))
);
GO

-- ============================================================
-- 25. feedbacks
-- ============================================================
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

-- ============================================================
-- 26. blog_posts
-- ============================================================
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

-- ============================================================
-- 27. audit_logs
-- ============================================================
CREATE TABLE audit_logs (
    id          BIGINT          NOT NULL IDENTITY(1,1),
    user_id     BIGINT          NULL,
    action      NVARCHAR(100)   NOT NULL,
    entity_type NVARCHAR(100)   NOT NULL,
    entity_id   BIGINT          NULL,
    old_value   NVARCHAR(MAX)   NULL,
    new_value   NVARCHAR(MAX)   NULL,
    ip_address  NVARCHAR(45)    NULL,
    created_at  DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_audit_logs PRIMARY KEY (id),
    CONSTRAINT FK_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
);
GO

-- ============================================================
-- 28. system_configs
-- ============================================================
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

-- ============================================================
-- 29. backup_logs
-- ============================================================
CREATE TABLE backup_logs (
    id           BIGINT          NOT NULL IDENTITY(1,1),
    backup_name  NVARCHAR(255)   NOT NULL,
    file_path    NVARCHAR(500)   NOT NULL,
    type         NVARCHAR(20)    NOT NULL,
    status       NVARCHAR(20)    NOT NULL DEFAULT 'IN_PROGRESS',
    size_bytes   BIGINT          NULL,
    created_by   BIGINT          NULL,
    created_at   DATETIME2       NOT NULL DEFAULT GETDATE(),
    restored_at  DATETIME2       NULL,
    restored_by  BIGINT          NULL,
    CONSTRAINT PK_backup_logs PRIMARY KEY (id),
    CONSTRAINT FK_backup_logs_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT FK_backup_logs_restored_by FOREIGN KEY (restored_by) REFERENCES users(id),
    CONSTRAINT CK_backup_logs_type CHECK (type IN ('MANUAL', 'SCHEDULED')),
    CONSTRAINT CK_backup_logs_status CHECK (status IN ('IN_PROGRESS', 'SUCCESS', 'FAILED'))
);
GO

-- ============================================================
-- 30. discount_campaigns
-- ============================================================
CREATE TABLE discount_campaigns (
    id                  BIGINT          NOT NULL IDENTITY(1,1),
    name                NVARCHAR(200)   NOT NULL,
    description         NVARCHAR(500)   NULL,
    type                VARCHAR(20)     NOT NULL,
    value               DECIMAL(18,2)   NOT NULL,
    voucher_code        VARCHAR(50)     NULL,
    valid_from          DATE            NOT NULL,
    valid_to            DATE            NOT NULL,
    min_purchase_amount DECIMAL(18,2)   NULL,
    max_usage_count     INT             NULL,
    used_count          INT             NOT NULL DEFAULT 0,
    is_active           BIT             NOT NULL DEFAULT 1,
    created_at          DATETIME2       NULL,
    updated_at          DATETIME2       NULL,
    CONSTRAINT PK_discount_campaigns PRIMARY KEY (id),
    CONSTRAINT UQ_discount_campaigns_voucher_code UNIQUE (voucher_code),
    CONSTRAINT CK_discount_campaigns_type CHECK (type IN ('PERCENTAGE', 'FIXED_AMOUNT', 'VOUCHER'))
);
GO

-- ============================================================
-- 31. patient_service_subscriptions — gói dịch vụ nhiều buổi đã mua
-- ============================================================
CREATE TABLE patient_service_subscriptions (
    id              BIGINT          NOT NULL IDENTITY(1,1),
    patient_id      BIGINT          NOT NULL,
    service_id      BIGINT          NOT NULL,
    total_sessions  INT             NOT NULL,
    used_sessions   INT             NOT NULL DEFAULT 0,
    purchase_date   DATE            NOT NULL,
    expiry_date     DATE            NULL,
    status          VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE',
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

-- ============================================================
-- 32. care_sessions — từng buổi chăm sóc trong 1 gói dịch vụ
-- ============================================================
CREATE TABLE care_sessions (
    id                  BIGINT          NOT NULL IDENTITY(1,1),
    subscription_id     BIGINT          NOT NULL,
    patient_id          BIGINT          NOT NULL,
    nurse_id            BIGINT          NULL,
    scheduled_date_time DATETIME2       NOT NULL,
    status              VARCHAR(20)     NOT NULL DEFAULT 'BOOKED',
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

-- ============================================================
-- 33. lab_technicians — hồ sơ riêng cho Kỹ thuật viên xét nghiệm
-- (giống doctors); trước đây chỉ là 1 user gắn role LAB_TECHNICIAN
-- + 1 dòng staffs chung, không có license/chuyên môn thiết bị riêng.
-- ============================================================
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

-- ============================================================
-- Add FK từ lab_order_items → lab_results
-- (tạo sau vì lab_results phụ thuộc lab_orders, lab_order_items cũng vậy)
-- ============================================================
ALTER TABLE lab_order_items
    ADD CONSTRAINT FK_lab_order_items_result
    FOREIGN KEY (result_id) REFERENCES lab_results(id);
GO

-- ============================================================
-- Seed data: Roles mặc định
-- ============================================================
INSERT INTO roles (role_name, description) VALUES
    ('ADMIN',           N'Quản trị viên hệ thống'),
    ('MANAGER',         N'Quản lý phòng khám'),
    ('DOCTOR',          N'Bác sĩ'),
    ('RECEPTIONIST',    N'Lễ tân'),
    ('PHARMACIST',      N'Dược sĩ'),
    ('LAB_TECHNICIAN',  N'Kỹ thuật viên xét nghiệm'),
    ('NURSE',           N'Điều dưỡng'),
    ('PATIENT',         N'Bệnh nhân');
GO

-- ============================================================
-- Seed data: System configs mặc định
-- ============================================================
INSERT INTO system_configs (config_key, config_value, data_type, description) VALUES
    ('MAX_APPOINTMENTS_PER_DAY',    '30',   'INTEGER',  N'Số lịch hẹn tối đa mỗi bác sĩ mỗi ngày (BR-03)'),
    ('MIN_BOOKING_HOURS_AHEAD',     '2',    'INTEGER',  N'Đặt lịch trước ít nhất bao nhiêu giờ (BR-04)'),
    ('MIN_CANCEL_HOURS_AHEAD',      '1',    'INTEGER',  N'Hủy lịch trước ít nhất bao nhiêu giờ (BR-05)'),
    ('MAX_FAILED_LOGIN_ATTEMPTS',   '5',    'INTEGER',  N'Số lần đăng nhập sai tối đa trước khi khóa (BR-02)'),
    ('ACCOUNT_LOCK_DURATION_MIN',   '30',   'INTEGER',  N'Thời gian khóa tài khoản (phút) (BR-02)'),
    ('JWT_ACCESS_EXPIRY_MS',        '3600000',  'INTEGER',  N'JWT Access Token hết hạn sau (ms)'),
    ('JWT_REFRESH_EXPIRY_MS',       '604800000', 'INTEGER', N'JWT Refresh Token hết hạn sau (ms)');
GO

PRINT N'✅ Tạo database ECMS thành công — 33 bảng + seed data hoàn tất.';
GO
