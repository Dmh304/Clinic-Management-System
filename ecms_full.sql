-- ============================================================
-- ECMS — Eyes Clinic Management System
-- SQL Server Full Script (Schema + Seed Data)
-- Chạy script này trong SSMS sau khi đã tạo database ecms_db
-- Thứ tự tạo bảng đã được sắp xếp đúng theo FK dependency
-- Mật khẩu mặc định tất cả tài khoản: Password@123
-- ============================================================

USE ecms_db;
GO

-- ============================================================
-- PHẦN 1: TẠO CƠ SỞ DỮ LIỆU
-- ============================================================

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
    CONSTRAINT PK_users             PRIMARY KEY (id),
    CONSTRAINT UQ_users_email       UNIQUE (email),
    CONSTRAINT FK_users_role        FOREIGN KEY (role_id) REFERENCES roles(id),
    CONSTRAINT CK_users_gender      CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    CONSTRAINT CK_users_status      CHECK (status IN ('ACTIVE', 'INACTIVE', 'LOCKED'))
);
GO

-- Filtered unique index: cho phép nhiều NULL (walk-in user không có google_id)
CREATE UNIQUE INDEX UX_users_google_id
    ON users(google_id)
    WHERE google_id IS NOT NULL;
GO

-- ============================================================
-- 3. user_roles
-- ============================================================
CREATE TABLE user_roles (
    user_id     BIGINT      NOT NULL,
    role_id     BIGINT      NOT NULL,
    assigned_at DATETIME2   NOT NULL DEFAULT GETDATE(),
    assigned_by BIGINT      NULL,
    CONSTRAINT PK_user_roles PRIMARY KEY (user_id, role_id),
    CONSTRAINT FK_user_roles_user        FOREIGN KEY (user_id)     REFERENCES users(id),
    CONSTRAINT FK_user_roles_role        FOREIGN KEY (role_id)     REFERENCES roles(id),
    CONSTRAINT FK_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id)
);
GO

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
    CONSTRAINT PK_refresh_tokens            PRIMARY KEY (id),
    CONSTRAINT UQ_refresh_tokens_token_hash UNIQUE (token_hash),
    CONSTRAINT FK_refresh_tokens_user       FOREIGN KEY (user_id) REFERENCES users(id)
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
    CONSTRAINT PK_password_reset_tokens      PRIMARY KEY (id),
    CONSTRAINT UQ_password_reset_tokens_hash UNIQUE (token_hash),
    CONSTRAINT FK_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT CK_password_reset_tokens_type CHECK (type IN ('PASSWORD_RESET', 'EMAIL_VERIFY'))
);
GO

-- ============================================================
-- 6. patients
-- user_id NULL: hỗ trợ walk-in patient không có tài khoản hệ thống
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
    CONSTRAINT PK_patients          PRIMARY KEY (id),
    CONSTRAINT UQ_patients_user_id  UNIQUE (user_id),
    CONSTRAINT UQ_patients_cccd     UNIQUE (cccd),
    CONSTRAINT FK_patients_user     FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT CK_patients_gender     CHECK (gender     IN ('MALE', 'FEMALE', 'OTHER')),
    CONSTRAINT CK_patients_blood_type CHECK (blood_type IN ('A', 'B', 'AB', 'O', 'UNKNOWN')),
    CONSTRAINT CK_patients_status     CHECK (status     IN ('ACTIVE', 'INACTIVE'))
);
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
    CONSTRAINT PK_doctors                PRIMARY KEY (id),
    CONSTRAINT UQ_doctors_user_id        UNIQUE (user_id),
    CONSTRAINT UQ_doctors_doctor_code    UNIQUE (doctor_code),
    CONSTRAINT UQ_doctors_license_number UNIQUE (license_number),
    CONSTRAINT FK_doctors_user           FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT CK_doctors_status         CHECK (status IN ('ACTIVE', 'INACTIVE'))
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
    CONSTRAINT PK_staffs                PRIMARY KEY (id),
    CONSTRAINT UQ_staffs_user_id        UNIQUE (user_id),
    CONSTRAINT UQ_staffs_employee_code  UNIQUE (employee_code),
    CONSTRAINT FK_staffs_user           FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT CK_staffs_status         CHECK (status IN ('ACTIVE', 'INACTIVE'))
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
    CONSTRAINT PK_doctor_schedules        PRIMARY KEY (id),
    CONSTRAINT FK_doctor_schedules_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    CONSTRAINT CK_doctor_schedules_status CHECK (status IN ('AVAILABLE', 'FULL', 'CANCELLED'))
);
GO

-- ============================================================
-- 10. services
-- ============================================================
CREATE TABLE services (
    id               BIGINT          NOT NULL IDENTITY(1,1),
    name             NVARCHAR(255)   NOT NULL,
    category         NVARCHAR(100)   NOT NULL,
    price            DECIMAL(10,2)   NOT NULL,
    duration_minutes INT             NULL,
    image_url        NVARCHAR(500)   NULL,
    is_lab_service   BIT             NOT NULL DEFAULT 0,
    description      NVARCHAR(MAX)   NULL,
    status           NVARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    created_at       DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at       DATETIME2       NULL,
    CONSTRAINT PK_services        PRIMARY KEY (id),
    CONSTRAINT CK_services_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
GO

-- ============================================================
-- 11. appointments
-- appointment_date: cột rút gọn ngày hẹn (không bao gồm giờ)
-- status bao gồm WAITING (bệnh nhân đã check-in, chờ gặp bác sĩ)
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
    CONSTRAINT PK_appointments             PRIMARY KEY (id),
    CONSTRAINT FK_appointments_patient     FOREIGN KEY (patient_id)  REFERENCES patients(id),
    CONSTRAINT FK_appointments_doctor      FOREIGN KEY (doctor_id)   REFERENCES doctors(id),
    CONSTRAINT FK_appointments_service     FOREIGN KEY (service_id)  REFERENCES services(id),
    CONSTRAINT FK_appointments_check_in_by FOREIGN KEY (check_in_by) REFERENCES users(id),
    CONSTRAINT FK_appointments_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id),
    CONSTRAINT CK_appointments_type   CHECK (type   IN ('ONLINE', 'WALK_IN')),
    CONSTRAINT CK_appointments_status CHECK (status IN ('PENDING', 'CONFIRMED', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
);
GO

-- ============================================================
-- 12. medical_records
-- Lưu chỉ số nhãn khoa: VA, BCVA, Sph/Cyl/Axis, IOP (cả 2 mắt)
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
    -- Thị lực không kính / có kính tốt nhất (trái/phải)
    va_l             DECIMAL(4,2)    NULL,
    va_r             DECIMAL(4,2)    NULL,
    bcva_l           DECIMAL(4,2)    NULL,
    bcva_r           DECIMAL(4,2)    NULL,
    -- Khúc xạ mắt trái
    sph_l            DECIMAL(5,2)    NULL,
    cyl_l            DECIMAL(5,2)    NULL,
    axis_l           SMALLINT        NULL,
    iop_l            DECIMAL(4,1)    NULL,
    -- Khúc xạ mắt phải
    sph_r            DECIMAL(5,2)    NULL,
    cyl_r            DECIMAL(5,2)    NULL,
    axis_r           SMALLINT        NULL,
    iop_r            DECIMAL(4,1)    NULL,
    total_amount     DECIMAL(10,2)   NULL,
    locked_at        DATETIME2       NULL,
    locked_by        BIGINT          NULL,
    status           NVARCHAR(20)    NOT NULL DEFAULT 'DRAFT',
    created_at       DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at       DATETIME2       NULL,
    CONSTRAINT PK_medical_records              PRIMARY KEY (id),
    CONSTRAINT UQ_medical_records_appointment  UNIQUE (appointment_id),
    CONSTRAINT FK_medical_records_appointment  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    CONSTRAINT FK_medical_records_patient      FOREIGN KEY (patient_id)     REFERENCES patients(id),
    CONSTRAINT FK_medical_records_doctor       FOREIGN KEY (doctor_id)      REFERENCES doctors(id),
    CONSTRAINT FK_medical_records_locked_by    FOREIGN KEY (locked_by)      REFERENCES users(id),
    CONSTRAINT CK_medical_records_status       CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED'))
);
GO

-- ============================================================
-- 13. prescriptions
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
    CONSTRAINT PK_prescriptions                 PRIMARY KEY (id),
    CONSTRAINT FK_prescriptions_medical_record  FOREIGN KEY (medical_record_id) REFERENCES medical_records(id),
    CONSTRAINT FK_prescriptions_issued_by       FOREIGN KEY (issued_by)         REFERENCES users(id),
    CONSTRAINT FK_prescriptions_dispensed_by    FOREIGN KEY (dispensed_by)      REFERENCES users(id),
    CONSTRAINT CK_prescriptions_type   CHECK (type   IN ('MEDICINE', 'GLASSES', 'BOTH')),
    CONSTRAINT CK_prescriptions_status CHECK (status IN ('PENDING', 'IN_PREPARATION', 'DISPENSED', 'SKIPPED'))
);
GO

-- ============================================================
-- 14. medicines
-- ============================================================
CREATE TABLE medicines (
    id                    BIGINT          NOT NULL IDENTITY(1,1),
    name                  NVARCHAR(255)   NOT NULL,
    unit                  NVARCHAR(50)    NOT NULL,
    dosage_form           NVARCHAR(50)    NOT NULL,
    category              NVARCHAR(100)   NULL,
    unit_price            DECIMAL(10,2)   NOT NULL,
    requires_prescription BIT             NOT NULL DEFAULT 1,
    description           NVARCHAR(MAX)   NULL,
    status                NVARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    created_at            DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at            DATETIME2       NULL,
    CONSTRAINT PK_medicines             PRIMARY KEY (id),
    CONSTRAINT CK_medicines_dosage_form CHECK (dosage_form IN ('TABLET', 'CAPSULE', 'LIQUID', 'DROP', 'INJECTION', 'OINTMENT', 'OTHER')),
    CONSTRAINT CK_medicines_status      CHECK (status      IN ('ACTIVE', 'INACTIVE'))
);
GO

-- ============================================================
-- 15. prescription_items
-- ============================================================
CREATE TABLE prescription_items (
    id                 BIGINT          NOT NULL IDENTITY(1,1),
    prescription_id    BIGINT          NOT NULL,
    medicine_id        BIGINT          NOT NULL,
    quantity           INT             NOT NULL,
    unit               NVARCHAR(50)    NOT NULL,
    dosage_instruction NVARCHAR(MAX)   NOT NULL,
    unit_price         DECIMAL(10,2)   NULL,
    status             NVARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    created_at         DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_prescription_items              PRIMARY KEY (id),
    CONSTRAINT FK_prescription_items_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
    CONSTRAINT FK_prescription_items_medicine     FOREIGN KEY (medicine_id)     REFERENCES medicines(id),
    CONSTRAINT CK_prescription_items_status       CHECK (status IN ('PENDING', 'DISPENSED', 'CANCELLED'))
);
GO

-- ============================================================
-- 16. glasses_orders
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
    CONSTRAINT PK_glasses_orders              PRIMARY KEY (id),
    CONSTRAINT FK_glasses_orders_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
    CONSTRAINT FK_glasses_orders_dispensed_by FOREIGN KEY (dispensed_by)    REFERENCES users(id),
    CONSTRAINT CK_glasses_orders_status       CHECK (status IN ('PENDING', 'IN_PRODUCTION', 'READY', 'DISPENSED', 'CANCELLED'))
);
GO

-- ============================================================
-- 17. lab_orders
-- ============================================================
CREATE TABLE lab_orders (
    id                BIGINT          NOT NULL IDENTITY(1,1),
    medical_record_id BIGINT          NOT NULL,
    ordered_by        BIGINT          NOT NULL,
    assigned_to       BIGINT          NULL,
    notes             NVARCHAR(MAX)   NULL,
    priority          NVARCHAR(20)    NOT NULL DEFAULT 'NORMAL',
    completed_at      DATETIME2       NULL,
    status            NVARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    created_at        DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at        DATETIME2       NULL,
    CONSTRAINT PK_lab_orders                 PRIMARY KEY (id),
    CONSTRAINT FK_lab_orders_medical_record  FOREIGN KEY (medical_record_id) REFERENCES medical_records(id),
    CONSTRAINT FK_lab_orders_ordered_by      FOREIGN KEY (ordered_by)        REFERENCES users(id),
    CONSTRAINT FK_lab_orders_assigned_to     FOREIGN KEY (assigned_to)       REFERENCES users(id),
    CONSTRAINT CK_lab_orders_priority        CHECK (priority IN ('NORMAL', 'URGENT')),
    CONSTRAINT CK_lab_orders_status          CHECK (status   IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
);
GO

-- ============================================================
-- 18. lab_order_items  (result_id: FK thêm sau khi tạo lab_results)
-- ============================================================
CREATE TABLE lab_order_items (
    id           BIGINT          NOT NULL IDENTITY(1,1),
    lab_order_id BIGINT          NOT NULL,
    service_id   BIGINT          NOT NULL,
    status       NVARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    result_id    BIGINT          NULL,
    created_at   DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_lab_order_items         PRIMARY KEY (id),
    CONSTRAINT FK_lab_order_items_lab_order FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id),
    CONSTRAINT FK_lab_order_items_service   FOREIGN KEY (service_id)   REFERENCES services(id),
    CONSTRAINT CK_lab_order_items_status    CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED'))
);
GO

-- ============================================================
-- 19. lab_results
-- ============================================================
CREATE TABLE lab_results (
    id           BIGINT          NOT NULL IDENTITY(1,1),
    lab_order_id BIGINT          NOT NULL,
    result_data  NVARCHAR(MAX)   NULL,
    image_url    NVARCHAR(500)   NULL,
    doctor_notes NVARCHAR(MAX)   NULL,
    uploaded_by  BIGINT          NOT NULL,
    reviewed_by  BIGINT          NULL,
    reviewed_at  DATETIME2       NULL,
    status       NVARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    created_at   DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at   DATETIME2       NULL,
    CONSTRAINT PK_lab_results             PRIMARY KEY (id),
    CONSTRAINT FK_lab_results_lab_order   FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id),
    CONSTRAINT FK_lab_results_uploaded_by FOREIGN KEY (uploaded_by)  REFERENCES users(id),
    CONSTRAINT FK_lab_results_reviewed_by FOREIGN KEY (reviewed_by)  REFERENCES users(id),
    CONSTRAINT CK_lab_results_status      CHECK (status IN ('PENDING', 'COMPLETED', 'REVIEWED'))
);
GO

-- FK vòng: lab_order_items.result_id → lab_results (tạo sau)
ALTER TABLE lab_order_items
    ADD CONSTRAINT FK_lab_order_items_result
    FOREIGN KEY (result_id) REFERENCES lab_results(id);
GO

-- ============================================================
-- 20. service_assignments
-- ============================================================
CREATE TABLE service_assignments (
    id            BIGINT          NOT NULL IDENTITY(1,1),
    lab_result_id BIGINT          NOT NULL,
    service_id    BIGINT          NOT NULL,
    status        NVARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    created_at    DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_service_assignments            PRIMARY KEY (id),
    CONSTRAINT FK_service_assignments_lab_result FOREIGN KEY (lab_result_id) REFERENCES lab_results(id),
    CONSTRAINT FK_service_assignments_service    FOREIGN KEY (service_id)    REFERENCES services(id),
    CONSTRAINT CK_service_assignments_status     CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
GO

-- ============================================================
-- 21. invoices
-- ============================================================
CREATE TABLE invoices (
    id                BIGINT          NOT NULL IDENTITY(1,1),
    appointment_id    BIGINT          NOT NULL,
    patient_id        BIGINT          NOT NULL,
    sub_total         DECIMAL(10,2)   NOT NULL DEFAULT 0,
    discount_amount   DECIMAL(10,2)   NOT NULL DEFAULT 0,
    tax               DECIMAL(10,2)   NOT NULL DEFAULT 0,
    total_amount      DECIMAL(10,2)   NOT NULL DEFAULT 0,
    payment_method    NVARCHAR(20)    NULL,
    payment_status    NVARCHAR(20)    NOT NULL DEFAULT 'UNPAID',
    payment_reference NVARCHAR(255)   NULL,
    pdf_url           NVARCHAR(500)   NULL,
    issued_by         BIGINT          NULL,
    paid_at           DATETIME2       NULL,
    generated_at      DATETIME2       NULL,
    status            NVARCHAR(20)    NOT NULL DEFAULT 'DRAFT',
    created_at        DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at        DATETIME2       NULL,
    CONSTRAINT PK_invoices                PRIMARY KEY (id),
    CONSTRAINT FK_invoices_appointment    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    CONSTRAINT FK_invoices_patient        FOREIGN KEY (patient_id)     REFERENCES patients(id),
    CONSTRAINT FK_invoices_issued_by      FOREIGN KEY (issued_by)      REFERENCES users(id),
    CONSTRAINT CK_invoices_payment_method CHECK (payment_method IN ('CASH', 'VIET_QR', 'OTHER')),
    CONSTRAINT CK_invoices_payment_status CHECK (payment_status IN ('UNPAID', 'PAID', 'PAYMENT_FAILED', 'PENDING_PAYMENT')),
    CONSTRAINT CK_invoices_status         CHECK (status          IN ('DRAFT', 'ISSUED', 'CANCELLED'))
);
GO

-- ============================================================
-- 22. invoice_details
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
    CONSTRAINT PK_invoice_details           PRIMARY KEY (id),
    CONSTRAINT FK_invoice_details_invoice   FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    CONSTRAINT CK_invoice_details_item_type CHECK (item_type IN ('SERVICE', 'MEDICINE', 'GLASSES', 'OTHER')),
    CONSTRAINT CK_invoice_details_status    CHECK (status    IN ('ACTIVE', 'CANCELLED'))
);
GO

-- ============================================================
-- 23. notifications
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
    CONSTRAINT PK_notifications         PRIMARY KEY (id),
    CONSTRAINT FK_notifications_user    FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT CK_notifications_channel     CHECK (channel     IN ('EMAIL', 'IN_APP', 'SMS')),
    CONSTRAINT CK_notifications_sent_status CHECK (sent_status IN ('PENDING', 'SENT', 'FAILED'))
);
GO

-- ============================================================
-- 24. feedbacks
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
    CONSTRAINT PK_feedbacks             PRIMARY KEY (id),
    CONSTRAINT FK_feedbacks_patient     FOREIGN KEY (patient_id)     REFERENCES patients(id),
    CONSTRAINT FK_feedbacks_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    CONSTRAINT FK_feedbacks_doctor      FOREIGN KEY (doctor_id)      REFERENCES doctors(id),
    CONSTRAINT CK_feedbacks_rating      CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT CK_feedbacks_status      CHECK (status IN ('PENDING', 'APPROVED', 'HIDDEN'))
);
GO

-- ============================================================
-- 25. blog_posts
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
    CONSTRAINT PK_blog_posts        PRIMARY KEY (id),
    CONSTRAINT UQ_blog_posts_slug   UNIQUE (slug),
    CONSTRAINT FK_blog_posts_author FOREIGN KEY (author_id) REFERENCES users(id),
    CONSTRAINT CK_blog_posts_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);
GO

-- ============================================================
-- 26. audit_logs
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
    CONSTRAINT PK_audit_logs      PRIMARY KEY (id),
    CONSTRAINT FK_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
);
GO

-- ============================================================
-- 27. system_configs
-- ============================================================
CREATE TABLE system_configs (
    id           BIGINT          NOT NULL IDENTITY(1,1),
    config_key   NVARCHAR(100)   NOT NULL,
    config_value NVARCHAR(MAX)   NOT NULL,
    data_type    NVARCHAR(20)    NOT NULL DEFAULT 'STRING',
    description  NVARCHAR(MAX)   NULL,
    updated_by   BIGINT          NULL,
    updated_at   DATETIME2       NULL,
    CONSTRAINT PK_system_configs        PRIMARY KEY (id),
    CONSTRAINT UQ_system_configs_key    UNIQUE (config_key),
    CONSTRAINT FK_system_configs_updated_by FOREIGN KEY (updated_by) REFERENCES users(id),
    CONSTRAINT CK_system_configs_data_type  CHECK (data_type IN ('STRING', 'INTEGER', 'BIT', 'JSON'))
);
GO

-- ============================================================
-- 29. blogs
-- ============================================================
CREATE TABLE blogs (
    id           BIGINT          NOT NULL IDENTITY(1,1),
    title        NVARCHAR(255)   NOT NULL,
    summary      NVARCHAR(500)   NULL,
    content      NVARCHAR(MAX)   NULL,
    author       NVARCHAR(255)   NULL,
    category     NVARCHAR(100)   NULL,
    image_url    NVARCHAR(500)   NULL,
    published_at DATETIME2       NULL,
    status       NVARCHAR(20)    NULL,
    CONSTRAINT PK_blogs PRIMARY KEY (id)
);
GO

-- ============================================================
-- 30. clinic_services
-- ============================================================
CREATE TABLE clinic_services (
    id               BIGINT          NOT NULL IDENTITY(1,1),
    service_name     NVARCHAR(255)   NOT NULL,
    description      NVARCHAR(MAX)   NULL,
    price            DECIMAL(10,2)   NULL,
    duration_minutes INT             NULL,
    CONSTRAINT PK_clinic_services PRIMARY KEY (id)
);
GO

-- ============================================================
-- 28. backup_logs
-- ============================================================
CREATE TABLE backup_logs (
    id          BIGINT          NOT NULL IDENTITY(1,1),
    backup_name NVARCHAR(255)   NOT NULL,
    file_path   NVARCHAR(500)   NOT NULL,
    type        NVARCHAR(20)    NOT NULL,
    status      NVARCHAR(20)    NOT NULL DEFAULT 'IN_PROGRESS',
    size_bytes  BIGINT          NULL,
    created_by  BIGINT          NULL,
    created_at  DATETIME2       NOT NULL DEFAULT GETDATE(),
    restored_at DATETIME2       NULL,
    restored_by BIGINT          NULL,
    CONSTRAINT PK_backup_logs             PRIMARY KEY (id),
    CONSTRAINT FK_backup_logs_created_by  FOREIGN KEY (created_by)  REFERENCES users(id),
    CONSTRAINT FK_backup_logs_restored_by FOREIGN KEY (restored_by) REFERENCES users(id),
    CONSTRAINT CK_backup_logs_type        CHECK (type   IN ('MANUAL', 'SCHEDULED')),
    CONSTRAINT CK_backup_logs_status      CHECK (status IN ('IN_PROGRESS', 'SUCCESS', 'FAILED'))
);
GO

-- ============================================================
-- Seed: Roles mặc định
-- ============================================================
INSERT INTO roles (role_name, description) VALUES
    (N'ADMIN',          N'Quản trị viên hệ thống'),
    (N'MANAGER',        N'Quản lý phòng khám'),
    (N'DOCTOR',         N'Bác sĩ'),
    (N'RECEPTIONIST',   N'Lễ tân'),
    (N'PHARMACIST',     N'Dược sĩ'),
    (N'LAB_TECHNICIAN', N'Kỹ thuật viên xét nghiệm'),
    (N'PATIENT',        N'Bệnh nhân');
GO

-- ============================================================
-- Seed: System configs mặc định
-- ============================================================
INSERT INTO system_configs (config_key, config_value, data_type, description) VALUES
    (N'MAX_APPOINTMENTS_PER_DAY',  N'30',        N'INTEGER', N'Số lịch hẹn tối đa mỗi bác sĩ mỗi ngày'),
    (N'MIN_BOOKING_HOURS_AHEAD',   N'2',         N'INTEGER', N'Đặt lịch trước ít nhất bao nhiêu giờ'),
    (N'MIN_CANCEL_HOURS_AHEAD',    N'1',         N'INTEGER', N'Hủy lịch trước ít nhất bao nhiêu giờ'),
    (N'MAX_FAILED_LOGIN_ATTEMPTS', N'5',         N'INTEGER', N'Số lần đăng nhập sai tối đa trước khi khóa'),
    (N'ACCOUNT_LOCK_DURATION_MIN', N'30',        N'INTEGER', N'Thời gian khóa tài khoản (phút)'),
    (N'JWT_ACCESS_EXPIRY_MS',      N'3600000',   N'INTEGER', N'JWT Access Token hết hạn sau (ms)'),
    (N'JWT_REFRESH_EXPIRY_MS',     N'604800000', N'INTEGER', N'JWT Refresh Token hết hạn sau (ms)');
GO

PRINT N'=== PHẦN 1 HOÀN TẤT: 30 bảng + roles + system_configs ===';
GO


-- ============================================================
-- PHẦN 2: DỮ LIỆU MẪU (SEED DATA)
-- ============================================================

-- ============================================================
-- 1. users  (14 user: 1 admin, 1 manager, 3 bác sĩ, 2 lễ tân,
--            1 dược sĩ, 1 kỹ thuật viên, 5 bệnh nhân)
-- Mật khẩu tất cả: Password@123
-- ============================================================
SET IDENTITY_INSERT users ON;

INSERT INTO users
    (id, email, password, full_name, phone_number, date_of_birth,
     gender, address, email_verified_at, status, enabled, role_id, created_at)
VALUES
(1,  N'admin@ecms.vn',         N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Nguyễn Quản Trị',     N'0901000001', '1985-03-15', N'MALE',
     N'1 Lê Lợi, Q1, TP.HCM',             GETDATE(), N'ACTIVE', 1, 1, GETDATE()),

(2,  N'manager@ecms.vn',       N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Trần Thị Quản Lý',    N'0901000002', '1988-07-20', N'FEMALE',
     N'2 Nguyễn Huệ, Q1, TP.HCM',         GETDATE(), N'ACTIVE', 1, 2, GETDATE()),

(3,  N'doctor.nguyen@ecms.vn', N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'BS. Nguyễn Văn An',   N'0901000003', '1980-01-10', N'MALE',
     N'3 Pasteur, Q3, TP.HCM',             GETDATE(), N'ACTIVE', 1, 3, GETDATE()),

(4,  N'doctor.tran@ecms.vn',   N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'BS. Trần Thị Bình',   N'0901000004', '1983-05-25', N'FEMALE',
     N'4 Đinh Tiên Hoàng, Q1, TP.HCM',    GETDATE(), N'ACTIVE', 1, 3, GETDATE()),

(5,  N'doctor.le@ecms.vn',     N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'BS. Lê Minh Châu',    N'0901000005', '1979-11-08', N'MALE',
     N'5 Võ Văn Tần, Q3, TP.HCM',         GETDATE(), N'ACTIVE', 1, 3, GETDATE()),

(6,  N'reception1@ecms.vn',    N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Phạm Lễ Tân Một',     N'0901000006', '1995-04-12', N'FEMALE',
     N'6 Bạch Đằng, Q.BT, TP.HCM',        GETDATE(), N'ACTIVE', 1, 4, GETDATE()),

(7,  N'reception2@ecms.vn',    N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Hoàng Lễ Tân Hai',    N'0901000007', '1997-09-30', N'MALE',
     N'7 Cộng Hòa, Q.TB, TP.HCM',         GETDATE(), N'ACTIVE', 1, 4, GETDATE()),

(8,  N'pharmacist@ecms.vn',    N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Vũ Dược Sĩ',          N'0901000008', '1990-06-18', N'FEMALE',
     N'8 Tô Hiến Thành, Q10, TP.HCM',     GETDATE(), N'ACTIVE', 1, 5, GETDATE()),

(9,  N'labtech@ecms.vn',       N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Đặng Kỹ Thuật Viên',  N'0901000009', '1993-02-22', N'MALE',
     N'9 Nguyễn Thị Minh Khai, Q3',       GETDATE(), N'ACTIVE', 1, 6, GETDATE()),

(10, N'patient1@gmail.com',    N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Bùi Văn Bệnh Nhân',   N'0912000001', '1990-03-10', N'MALE',
     N'10 Lý Thường Kiệt, Q10, TP.HCM',   GETDATE(), N'ACTIVE', 1, 7, GETDATE()),

(11, N'patient2@gmail.com',    N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Đinh Thị Hoa',        N'0912000002', '1995-08-15', N'FEMALE',
     N'11 Trần Hưng Đạo, Q5, TP.HCM',     GETDATE(), N'ACTIVE', 1, 7, GETDATE()),

(12, N'patient3@gmail.com',    N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Lý Văn Minh',         N'0912000003', '1982-12-05', N'MALE',
     N'12 An Dương Vương, Q5, TP.HCM',     GETDATE(), N'ACTIVE', 1, 7, GETDATE()),

(13, N'patient4@gmail.com',    N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Ngô Thị Lan',         N'0912000004', '2000-05-20', N'FEMALE',
     N'13 Nguyễn Văn Cừ, Q5, TP.HCM',     GETDATE(), N'ACTIVE', 1, 7, GETDATE()),

(14, N'patient5@gmail.com',    N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL536lW',
     N'Tô Văn Dũng',         N'0912000005', '1975-07-07', N'MALE',
     N'14 Hùng Vương, Q6, TP.HCM',         GETDATE(), N'ACTIVE', 1, 7, GETDATE());

SET IDENTITY_INSERT users OFF;
GO

-- ============================================================
-- 2. user_roles
-- roles: ADMIN=1, MANAGER=2, DOCTOR=3, RECEPTIONIST=4,
--        PHARMACIST=5, LAB_TECHNICIAN=6, PATIENT=7
-- ============================================================
INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES
(1,  1, NULL), -- admin        → ADMIN
(2,  2, 1),    -- manager      → MANAGER
(3,  3, 1),    -- doctor 1     → DOCTOR
(4,  3, 1),    -- doctor 2     → DOCTOR
(5,  3, 1),    -- doctor 3     → DOCTOR
(6,  4, 2),    -- reception 1  → RECEPTIONIST
(7,  4, 2),    -- reception 2  → RECEPTIONIST
(8,  5, 2),    -- pharmacist   → PHARMACIST
(9,  6, 2),    -- lab tech     → LAB_TECHNICIAN
(10, 7, NULL), -- patient 1    → PATIENT
(11, 7, NULL), -- patient 2    → PATIENT
(12, 7, NULL), -- patient 3    → PATIENT
(13, 7, NULL), -- patient 4    → PATIENT
(14, 7, NULL); -- patient 5    → PATIENT
GO

-- ============================================================
-- 3. doctors  (user_id 3, 4, 5)
-- ============================================================
SET IDENTITY_INSERT doctors ON;

INSERT INTO doctors
    (id, user_id, doctor_code, full_name, license_number, specialty,
     department, phone_number, email, experience_years, bio, status, created_at)
VALUES
(1, 3, N'DR001', N'BS. Nguyễn Văn An',
    N'BV-HCM-001234', N'Khoa mắt tổng quát',     N'Phòng khám tổng quát',
    N'0901000003', N'doctor.nguyen@ecms.vn', 12,
    N'Chuyên gia khám và điều trị các bệnh mắt thông thường.',  N'ACTIVE', GETDATE()),

(2, 4, N'DR002', N'BS. Trần Thị Bình',
    N'BV-HCM-005678', N'Khúc xạ & Kính áp tròng', N'Phòng khúc xạ',
    N'0901000004', N'doctor.tran@ecms.vn',   9,
    N'Chuyên điều trị tật khúc xạ, tư vấn kính áp tròng.',     N'ACTIVE', GETDATE()),

(3, 5, N'DR003', N'BS. Lê Minh Châu',
    N'BV-HCM-009012', N'Phẫu thuật mắt',          N'Phòng phẫu thuật',
    N'0901000005', N'doctor.le@ecms.vn',     15,
    N'Bác sĩ phẫu thuật đục thủy tinh thể và Lasik.',           N'ACTIVE', GETDATE());

SET IDENTITY_INSERT doctors OFF;
GO

-- ============================================================
-- 4. staffs  (user_id 6, 7, 8, 9)
-- ============================================================
SET IDENTITY_INSERT staffs ON;

INSERT INTO staffs
    (id, user_id, employee_code, full_name, department, position,
     phone_number, hire_date, status, created_at)
VALUES
(1, 6, N'EMP001', N'Phạm Lễ Tân Một',    N'Lễ tân',     N'Lễ tân viên',      N'0901000006', '2022-01-15', N'ACTIVE', GETDATE()),
(2, 7, N'EMP002', N'Hoàng Lễ Tân Hai',   N'Lễ tân',     N'Lễ tân viên',      N'0901000007', '2023-03-01', N'ACTIVE', GETDATE()),
(3, 8, N'EMP003', N'Vũ Dược Sĩ',         N'Nhà thuốc',  N'Dược sĩ',          N'0901000008', '2021-06-10', N'ACTIVE', GETDATE()),
(4, 9, N'EMP004', N'Đặng Kỹ Thuật Viên', N'Xét nghiệm', N'Kỹ thuật viên XN', N'0901000009', '2022-09-20', N'ACTIVE', GETDATE());

SET IDENTITY_INSERT staffs OFF;
GO

-- ============================================================
-- 5. patients  (user_id 10-14)
-- ============================================================
SET IDENTITY_INSERT patients ON;

INSERT INTO patients
    (id, user_id, patient_code, full_name, date_of_birth, gender, address,
     phone, email, cccd, blood_type, allergy_notes,
     emergency_contact_name, emergency_contact_phone, status, created_at)
VALUES
(1, 10, N'PAT001', N'Bùi Văn Bệnh Nhân', '1990-03-10', N'MALE',
    N'10 Lý Thường Kiệt, Q10', N'0912000001', N'patient1@gmail.com', N'079090001234',
    N'O',       N'Dị ứng Penicillin',  N'Bùi Thị Mẹ',  N'0912100001', N'ACTIVE', GETDATE()),

(2, 11, N'PAT002', N'Đinh Thị Hoa',       '1995-08-15', N'FEMALE',
    N'11 Trần Hưng Đạo, Q5',  N'0912000002', N'patient2@gmail.com', N'079095002345',
    N'A',       NULL,                   N'Đinh Văn Ba',  N'0912100002', N'ACTIVE', GETDATE()),

(3, 12, N'PAT003', N'Lý Văn Minh',        '1982-12-05', N'MALE',
    N'12 An Dương Vương, Q5', N'0912000003', N'patient3@gmail.com', N'079082003456',
    N'B',       N'Dị ứng Sulfonamide', N'Lý Thị Vợ',   N'0912100003', N'ACTIVE', GETDATE()),

(4, 13, N'PAT004', N'Ngô Thị Lan',        '2000-05-20', N'FEMALE',
    N'13 Nguyễn Văn Cừ, Q5', N'0912000004', N'patient4@gmail.com', N'079000004567',
    N'AB',      NULL,                   N'Ngô Văn Cha',  N'0912100004', N'ACTIVE', GETDATE()),

(5, 14, N'PAT005', N'Tô Văn Dũng',        '1975-07-07', N'MALE',
    N'14 Hùng Vương, Q6',     N'0912000005', N'patient5@gmail.com', N'079075005678',
    N'UNKNOWN', N'Cao huyết áp',       N'Tô Thị Vợ',   N'0912100005', N'ACTIVE', GETDATE());

SET IDENTITY_INSERT patients OFF;
GO

-- ============================================================
-- 6. services
-- ============================================================
SET IDENTITY_INSERT services ON;

INSERT INTO services
    (id, name, category, price, duration_minutes, is_lab_service, description, status, created_at)
VALUES
(1, N'Khám mắt tổng quát',               N'Khám lâm sàng',      150000,  30, 0,
    N'Khám sức khỏe mắt toàn diện, kiểm tra thị lực và áp suất nhãn cầu.',   N'ACTIVE', GETDATE()),
(2, N'Đo khúc xạ máy',                   N'Khúc xạ',             80000,  15, 0,
    N'Đo độ cận viễn loạn bằng máy tự động.',                                 N'ACTIVE', GETDATE()),
(3, N'Soi đáy mắt',                      N'Chẩn đoán hình ảnh', 200000,  20, 1,
    N'Kiểm tra võng mạc và dây thần kinh thị giác.',                          N'ACTIVE', GETDATE()),
(4, N'Chụp OCT võng mạc',                N'Chẩn đoán hình ảnh', 350000,  25, 1,
    N'Chụp cắt lớp kết hợp quang học để đánh giá võng mạc.',                 N'ACTIVE', GETDATE()),
(5, N'Đo nhãn áp',                       N'Chẩn đoán',           60000,  10, 0,
    N'Đo áp suất trong mắt để sàng lọc tăng nhãn áp.',                       N'ACTIVE', GETDATE()),
(6, N'Chụp bản đồ giác mạc (Topo)',      N'Chẩn đoán hình ảnh', 250000,  20, 1,
    N'Phân tích hình thái giác mạc bằng máy Topographer.',                    N'ACTIVE', GETDATE()),
(7, N'Xét nghiệm sinh hóa máu cơ bản',  N'Xét nghiệm',         180000,  60, 1,
    N'Xét nghiệm đường huyết, mỡ máu phục vụ tiền phẫu.',                    N'ACTIVE', GETDATE()),
(8, N'Phẫu thuật đục thủy tinh thể',    N'Phẫu thuật',       15000000,  90, 0,
    N'Phẫu thuật Phaco thay thể thủy tinh nhân tạo.',                         N'ACTIVE', GETDATE());

SET IDENTITY_INSERT services OFF;
GO

-- ============================================================
-- 7. doctor_schedules
-- Quá khứ FULL (cho appointments COMPLETED), tương lai AVAILABLE
-- ============================================================
SET IDENTITY_INSERT doctor_schedules ON;

INSERT INTO doctor_schedules
    (id, doctor_id, work_date, slot_start, slot_end, max_slot, booked_slot, status, created_at)
VALUES
-- BS. Nguyễn Văn An (doctor_id=1)
(1,  1, CAST(DATEADD(DAY,-3, GETDATE()) AS DATE), '07:30', '11:30', 10, 10, N'FULL',      GETDATE()),
(2,  1, CAST(DATEADD(DAY,-1, GETDATE()) AS DATE), '13:00', '17:00', 10,  4, N'AVAILABLE', GETDATE()),
(3,  1, CAST(DATEADD(DAY, 1, GETDATE()) AS DATE), '07:30', '11:30', 10,  2, N'AVAILABLE', GETDATE()),
(4,  1, CAST(DATEADD(DAY, 2, GETDATE()) AS DATE), '13:00', '17:00', 10,  0, N'AVAILABLE', GETDATE()),
-- BS. Trần Thị Bình (doctor_id=2)
(5,  2, CAST(DATEADD(DAY,-3, GETDATE()) AS DATE), '07:30', '11:30',  8,  8, N'FULL',      GETDATE()),
(6,  2, CAST(DATEADD(DAY,-1, GETDATE()) AS DATE), '13:00', '17:00',  8,  2, N'AVAILABLE', GETDATE()),
(7,  2, CAST(DATEADD(DAY, 1, GETDATE()) AS DATE), '07:30', '11:30',  8,  1, N'AVAILABLE', GETDATE()),
(8,  2, CAST(DATEADD(DAY, 3, GETDATE()) AS DATE), '13:00', '17:00',  8,  0, N'AVAILABLE', GETDATE()),
-- BS. Lê Minh Châu (doctor_id=3)
(9,  3, CAST(DATEADD(DAY,-2, GETDATE()) AS DATE), '07:30', '11:30',  6,  6, N'FULL',      GETDATE()),
(10, 3, CAST(DATEADD(DAY, 2, GETDATE()) AS DATE), '07:30', '11:30',  6,  0, N'AVAILABLE', GETDATE()),
(11, 3, CAST(DATEADD(DAY, 4, GETDATE()) AS DATE), '13:00', '17:00',  6,  0, N'AVAILABLE', GETDATE());

SET IDENTITY_INSERT doctor_schedules OFF;
GO

-- ============================================================
-- 8. medicines
-- ============================================================
SET IDENTITY_INSERT medicines ON;

INSERT INTO medicines
    (id, name, unit, dosage_form, category, unit_price,
     requires_prescription, description, status, created_at)
VALUES
(1, N'Tobramycin 0.3% nhỏ mắt',      N'Lọ 5ml',      N'DROP',   N'Kháng sinh nhỏ mắt', 45000, 1,
    N'Điều trị nhiễm khuẩn mắt.',                         N'ACTIVE', GETDATE()),
(2, N'Dexamethasone 0.1% nhỏ mắt',   N'Lọ 5ml',      N'DROP',   N'Chống viêm nhỏ mắt', 38000, 1,
    N'Giảm viêm, dị ứng mắt.',                            N'ACTIVE', GETDATE()),
(3, N'Hylo-Comod nước mắt nhân tạo', N'Lọ 10ml',     N'DROP',   N'Nước mắt nhân tạo',  85000, 0,
    N'Điều trị khô mắt.',                                  N'ACTIVE', GETDATE()),
(4, N'Timolol 0.5% nhỏ mắt',         N'Lọ 5ml',      N'DROP',   N'Hạ nhãn áp',          55000, 1,
    N'Điều trị tăng nhãn áp và glaucoma.',                 N'ACTIVE', GETDATE()),
(5, N'Vitamin A 5000 IU',             N'Hộp 30 viên', N'TABLET', N'Vitamin',              30000, 0,
    N'Bổ sung Vitamin A, hỗ trợ thị lực.',                 N'ACTIVE', GETDATE()),
(6, N'Ciprofloxacin 0.3% nhỏ mắt',   N'Lọ 5ml',      N'DROP',   N'Kháng sinh nhỏ mắt', 42000, 1,
    N'Điều trị nhiễm khuẩn giác mạc, kết mạc.',           N'ACTIVE', GETDATE());

SET IDENTITY_INSERT medicines OFF;
GO

-- ============================================================
-- 9. appointments  (8 lịch hẹn quá khứ + 3 lịch hẹn hôm nay)
-- ============================================================
SET IDENTITY_INSERT appointments ON;

DECLARE @m3 DATETIME2 = CAST(CAST(DATEADD(DAY,-3, GETDATE()) AS DATE) AS DATETIME2);
DECLARE @m2 DATETIME2 = CAST(CAST(DATEADD(DAY,-2, GETDATE()) AS DATE) AS DATETIME2);
DECLARE @m1 DATETIME2 = CAST(CAST(DATEADD(DAY,-1, GETDATE()) AS DATE) AS DATETIME2);
DECLARE @p1 DATETIME2 = CAST(CAST(DATEADD(DAY, 1, GETDATE()) AS DATE) AS DATETIME2);
DECLARE @p2 DATETIME2 = CAST(CAST(DATEADD(DAY, 2, GETDATE()) AS DATE) AS DATETIME2);
DECLARE @t0 DATETIME2 = CAST(CAST(GETDATE() AS DATE) AS DATETIME2);

INSERT INTO appointments
    (id, patient_id, doctor_id, service_id,
     appointment_date, appointment_time,
     type, notes, queue_number, check_in_time, check_in_by,
     cancel_reason, cancelled_by, cancelled_at, status, created_at)
VALUES
-- Quá khứ: COMPLETED
(1, 1, 1, 1,
    CAST(DATEADD(DAY,-3,GETDATE()) AS DATE), DATEADD(MINUTE, 7*60+45, @m3),
    N'ONLINE',  N'Khám định kỳ - mờ mắt',       1, DATEADD(MINUTE, 7*60+40,@m3), 6,
    NULL,NULL,NULL, N'COMPLETED', DATEADD(DAY,-4,GETDATE())),

(2, 2, 1, 1,
    CAST(DATEADD(DAY,-3,GETDATE()) AS DATE), DATEADD(MINUTE, 8*60+30, @m3),
    N'WALK_IN', N'Mắt đỏ kéo dài 3 ngày',        2, DATEADD(MINUTE, 8*60+25,@m3), 6,
    NULL,NULL,NULL, N'COMPLETED', DATEADD(DAY,-3,GETDATE())),

(3, 3, 2, 2,
    CAST(DATEADD(DAY,-3,GETDATE()) AS DATE), DATEADD(MINUTE, 9*60+0,  @m3),
    N'ONLINE',  N'Đo lại kính',                   3, DATEADD(MINUTE, 8*60+55,@m3), 7,
    NULL,NULL,NULL, N'COMPLETED', DATEADD(DAY,-5,GETDATE())),

(4, 4, 3, 8,
    CAST(DATEADD(DAY,-2,GETDATE()) AS DATE), DATEADD(MINUTE, 7*60+30, @m2),
    N'ONLINE',  N'Phẫu thuật đục TTT mắt phải',  1, DATEADD(MINUTE, 7*60+20,@m2), 6,
    NULL,NULL,NULL, N'COMPLETED', DATEADD(DAY,-7,GETDATE())),

-- Quá khứ: IN_PROGRESS (hôm qua)
(5, 5, 1, 5,
    CAST(DATEADD(DAY,-1,GETDATE()) AS DATE), DATEADD(MINUTE,13*60+0,  @m1),
    N'WALK_IN', N'Kiểm tra nhãn áp định kỳ',     1, DATEADD(MINUTE,12*60+55,@m1), 6,
    NULL,NULL,NULL, N'IN_PROGRESS', DATEADD(DAY,-1,GETDATE())),

-- Ngày mai: CONFIRMED
(6, 1, 2, 2,
    CAST(DATEADD(DAY,1,GETDATE()) AS DATE), DATEADD(MINUTE, 9*60+0,  @p1),
    N'ONLINE',  N'Tái khám khúc xạ',              NULL,NULL,NULL,
    NULL,NULL,NULL, N'CONFIRMED', GETDATE()),

-- Ngày kia: PENDING
(7, 2, 3, 8,
    CAST(DATEADD(DAY,2,GETDATE()) AS DATE), DATEADD(MINUTE, 7*60+30, @p2),
    N'ONLINE',  N'Tư vấn phẫu thuật Lasik',       NULL,NULL,NULL,
    NULL,NULL,NULL, N'PENDING', GETDATE()),

-- Ngày mai: CANCELLED
(8, 3, 1, 1,
    CAST(DATEADD(DAY,1,GETDATE()) AS DATE), DATEADD(MINUTE,10*60+0,  @p1),
    N'WALK_IN', NULL,                              NULL,NULL,NULL,
    N'Bệnh nhân bận việc đột xuất', 12, GETDATE(), N'CANCELLED', GETDATE()),

-- Hôm nay: PENDING / CONFIRMED / PENDING
(9,  1, 1, 1,
    CAST(GETDATE() AS DATE), DATEADD(MINUTE, 8*60+0,  @t0),
    N'ONLINE',  NULL, NULL,NULL,NULL, NULL,NULL,NULL, N'PENDING',   GETDATE()),

(10, 2, 2, 2,
    CAST(GETDATE() AS DATE), DATEADD(MINUTE, 9*60+30, @t0),
    N'WALK_IN', NULL, NULL,NULL,NULL, NULL,NULL,NULL, N'CONFIRMED', GETDATE()),

(11, 3, 3, 8,
    CAST(GETDATE() AS DATE), DATEADD(MINUTE,10*60+0,  @t0),
    N'ONLINE',  NULL, NULL,NULL,NULL, NULL,NULL,NULL, N'PENDING',   GETDATE());

SET IDENTITY_INSERT appointments OFF;
GO

-- ============================================================
-- 10. medical_records  (cho 4 appointments COMPLETED: id 1-4)
-- ============================================================
SET IDENTITY_INSERT medical_records ON;

INSERT INTO medical_records
    (id, appointment_id, patient_id, doctor_id,
     chief_complaint, symptoms, diagnosis, treatment_plan, notes,
     va_l, va_r, bcva_l, bcva_r,
     sph_l, cyl_l, axis_l, iop_l,
     sph_r, cyl_r, axis_r, iop_r,
     total_amount, locked_at, locked_by, status, created_at)
VALUES
-- MR1: Cận thị tăng độ
(1, 1, 1, 1,
    N'Mắt mờ, nhức đầu sau khi nhìn màn hình',
    N'Thị lực giảm cả 2 mắt, không đỏ không đau',
    N'Cận thị tăng độ OU',
    N'Đổi kính, hạn chế màn hình, tái khám 6 tháng',
    N'Bệnh nhân làm việc máy tính >8h/ngày',
    0.6, 0.5, 1.0, 1.0,
    -2.50, -0.50, 180, 14.0,
    -3.00, -0.75, 175, 13.5,
    500000, DATEADD(DAY,-3,GETDATE()), 3, N'COMPLETED', DATEADD(DAY,-3,GETDATE())),

-- MR2: Viêm kết mạc
(2, 2, 2, 1,
    N'Mắt đỏ, chảy ghèn 3 ngày',
    N'Kết mạc cương tụ, tiết tố nhầy mủ 2 mắt',
    N'Viêm kết mạc cấp do vi khuẩn',
    N'Nhỏ kháng sinh + chống viêm 7 ngày, rửa mắt bằng nước muối sinh lý',
    NULL,
    0.9, 0.8, 1.0, 1.0,
    NULL,NULL,NULL, 15.0,
    NULL,NULL,NULL, 14.5,
    278000, DATEADD(DAY,-3,GETDATE()), 3, N'COMPLETED', DATEADD(DAY,-3,GETDATE())),

-- MR3: Cận thị + loạn
(3, 3, 3, 2,
    N'Mờ mắt khi nhìn xa, khó lái xe ban đêm',
    N'Thị lực giảm, quầng sáng quanh đèn về đêm',
    N'Cận thị OU, loạn thị nhẹ',
    N'Cấp đơn kính, tư vấn kính áp tròng toric nếu muốn',
    NULL,
    0.5, 0.4, 1.0, 1.0,
    -2.75, -0.50, 170, 13.0,
    -3.25, -0.50, 165, 12.5,
    80000, DATEADD(DAY,-3,GETDATE()), 4, N'COMPLETED', DATEADD(DAY,-3,GETDATE())),

-- MR4: Đục thủy tinh thể
(4, 4, 4, 3,
    N'Nhìn mờ như sương, chói sáng mạnh',
    N'Đục thể thủy tinh độ 3 cả 2 mắt',
    N'Đục thể thủy tinh tuổi già OU',
    N'Phẫu thuật Phaco + IOL cả 2 mắt, mắt phải trước',
    N'Đã xét nghiệm tiền phẫu, đủ điều kiện phẫu thuật',
    0.1, 0.1, 0.8, 0.7,
    NULL,NULL,NULL, 16.0,
    NULL,NULL,NULL, 15.5,
    15180000, DATEADD(DAY,-2,GETDATE()), 5, N'COMPLETED', DATEADD(DAY,-2,GETDATE()));

SET IDENTITY_INSERT medical_records OFF;
GO

-- ============================================================
-- 11. prescriptions
-- ============================================================
SET IDENTITY_INSERT prescriptions ON;

INSERT INTO prescriptions
    (id, medical_record_id, type, notes,
     issued_by, dispensed_by, dispensed_at, status, created_at)
VALUES
-- Đơn kính cho MR1 (đã cấp)
(1, 1, N'GLASSES',
    N'Kính cận đơn tròng. Tư vấn kính 2 tròng nếu > 40 tuổi.',
    3, 8, DATEADD(DAY,-3,GETDATE()), N'DISPENSED', DATEADD(DAY,-3,GETDATE())),

-- Đơn thuốc cho MR2 (đã cấp)
(2, 2, N'MEDICINE',
    N'Nhỏ kháng sinh sáng-tối, nhỏ chống viêm trưa-chiều trong 7 ngày.',
    3, 8, DATEADD(DAY,-3,GETDATE()), N'DISPENSED', DATEADD(DAY,-3,GETDATE())),

-- Đơn kính cho MR3 (chờ cấp)
(3, 3, N'GLASSES',
    N'Cận thị OU, cấp đơn kính gọng. Tư vấn thêm kính áp tròng toric.',
    4, NULL, NULL, N'PENDING', DATEADD(DAY,-3,GETDATE()));

SET IDENTITY_INSERT prescriptions OFF;
GO

-- ============================================================
-- 12. prescription_items  (cho đơn thuốc id=2)
-- ============================================================
SET IDENTITY_INSERT prescription_items ON;

INSERT INTO prescription_items
    (id, prescription_id, medicine_id, quantity, unit,
     dosage_instruction, unit_price, status, created_at)
VALUES
(1, 2, 1, 2, N'Lọ',
    N'Nhỏ 1 giọt/mắt, sáng và tối sau rửa mặt, dùng trong 7 ngày.',
    45000, N'DISPENSED', DATEADD(DAY,-3,GETDATE())),

(2, 2, 2, 1, N'Lọ',
    N'Nhỏ 1 giọt/mắt, trưa và chiều tối, dùng trong 5 ngày.',
    38000, N'DISPENSED', DATEADD(DAY,-3,GETDATE()));

SET IDENTITY_INSERT prescription_items OFF;
GO

-- ============================================================
-- 13. glasses_orders  (cho đơn kính đã cấp id=1)
-- ============================================================
SET IDENTITY_INSERT glasses_orders ON;

INSERT INTO glasses_orders
    (id, prescription_id, frame_description,
     sph_r, cyl_r, axis_r, sph_l, cyl_l, axis_l,
     add_power, pd_right, pd_left,
     lens_type, lens_coating,
     dispensed_by, dispensed_at, status, created_at)
VALUES
(1, 1,
    N'Gọng titan mỏng, màu đen, size M',
    -3.00, -0.75, 175,
    -2.50, -0.50, 180,
    NULL, 32.0, 31.5,
    N'Polycarbonate 1.60',
    N'Chống tia UV + chống phản chiếu (AR)',
    8, DATEADD(DAY,-2,GETDATE()), N'DISPENSED', DATEADD(DAY,-3,GETDATE()));

SET IDENTITY_INSERT glasses_orders OFF;
GO

-- ============================================================
-- 14. lab_orders
-- ============================================================
SET IDENTITY_INSERT lab_orders ON;

INSERT INTO lab_orders
    (id, medical_record_id, ordered_by, assigned_to, notes,
     priority, completed_at, status, created_at)
VALUES
-- Xét nghiệm tiền phẫu cho MR4 (URGENT - đã xong)
(1, 4, 5, 9,
    N'Xét nghiệm tiền phẫu: sinh hóa máu. Ưu tiên trả kết quả trong ngày.',
    N'URGENT', DATEADD(DAY,-2,GETDATE()), N'COMPLETED', DATEADD(DAY,-2,GETDATE())),

-- Chụp OCT cho MR1 (NORMAL - đã xong)
(2, 1, 3, 9,
    N'Chụp OCT hoàng điểm để loại trừ thoái hóa hoàng điểm.',
    N'NORMAL', DATEADD(DAY,-3,GETDATE()), N'COMPLETED', DATEADD(DAY,-3,GETDATE())),

-- Soi đáy mắt cho MR2 (NORMAL - đang chờ)
(3, 2, 3, 9,
    N'Soi đáy mắt loại trừ viêm màng bồ đào.',
    N'NORMAL', NULL, N'PENDING', DATEADD(DAY,-3,GETDATE()));

SET IDENTITY_INSERT lab_orders OFF;
GO

-- ============================================================
-- 15. lab_results  (cho lab_orders đã COMPLETED: id 1, 2)
-- ============================================================
SET IDENTITY_INSERT lab_results ON;

INSERT INTO lab_results
    (id, lab_order_id, result_data, doctor_notes,
     uploaded_by, reviewed_by, reviewed_at, status, created_at)
VALUES
(1, 1,
    N'{"glucose":"5.2 mmol/L","cholesterol":"4.8 mmol/L","HbA1c":"5.4%","PT":"13s","APTT":"32s","WBC":"7.2","RBC":"4.8","Hb":"140"}',
    N'Chỉ số tiền phẫu trong giới hạn bình thường. An toàn để phẫu thuật.',
    9, 5, DATEADD(DAY,-2,GETDATE()), N'REVIEWED', DATEADD(DAY,-2,GETDATE())),

(2, 2,
    N'{"OCT":"Hoàng điểm bình thường, độ dày võng mạc trung tâm 260μm, không phù hoàng điểm, IS/OS nguyên vẹn"}',
    N'Hình ảnh OCT bình thường. Không cần can thiệp thêm.',
    9, 3, DATEADD(DAY,-3,GETDATE()), N'REVIEWED', DATEADD(DAY,-3,GETDATE()));

SET IDENTITY_INSERT lab_results OFF;
GO

-- ============================================================
-- 16. lab_order_items
-- ============================================================
SET IDENTITY_INSERT lab_order_items ON;

INSERT INTO lab_order_items
    (id, lab_order_id, service_id, status, result_id, created_at)
VALUES
(1, 1, 7, N'COMPLETED', 1, DATEADD(DAY,-2,GETDATE())), -- XN sinh hóa → result 1
(2, 2, 4, N'COMPLETED', 2, DATEADD(DAY,-3,GETDATE())), -- OCT võng mạc → result 2
(3, 3, 3, N'PENDING',   NULL, DATEADD(DAY,-3,GETDATE())); -- Soi đáy mắt → chờ

SET IDENTITY_INSERT lab_order_items OFF;
GO

-- ============================================================
-- 17. service_assignments
-- ============================================================
SET IDENTITY_INSERT service_assignments ON;

INSERT INTO service_assignments
    (id, lab_result_id, service_id, status, created_at)
VALUES
(1, 1, 6, N'ACTIVE', DATEADD(DAY,-2,GETDATE())), -- kết quả XN → thêm chụp Topo
(2, 2, 5, N'ACTIVE', DATEADD(DAY,-3,GETDATE())); -- kết quả OCT → thêm đo nhãn áp

SET IDENTITY_INSERT service_assignments OFF;
GO

-- ============================================================
-- 18. invoices  (cho 4 appointments COMPLETED)
-- ============================================================
SET IDENTITY_INSERT invoices ON;

INSERT INTO invoices
    (id, appointment_id, patient_id,
     sub_total, discount_amount, tax, total_amount,
     payment_method, payment_status,
     issued_by, paid_at, generated_at, status, created_at)
VALUES
-- Invoice 1: khám tổng quát + OCT = 500,000
(1, 1, 1, 500000, 0, 0, 500000,
    N'CASH',     N'PAID', 6, DATEADD(DAY,-3,GETDATE()), DATEADD(DAY,-3,GETDATE()), N'ISSUED', DATEADD(DAY,-3,GETDATE())),

-- Invoice 2: khám + thuốc (2 Tobramycin + 1 Dexamethasone) = 278,000
(2, 2, 2, 278000, 0, 0, 278000,
    N'VIET_QR',  N'PAID', 6, DATEADD(DAY,-3,GETDATE()), DATEADD(DAY,-3,GETDATE()), N'ISSUED', DATEADD(DAY,-3,GETDATE())),

-- Invoice 3: đo khúc xạ = 80,000
(3, 3, 3, 80000,  0, 0, 80000,
    N'CASH',     N'PAID', 7, DATEADD(DAY,-3,GETDATE()), DATEADD(DAY,-3,GETDATE()), N'ISSUED', DATEADD(DAY,-3,GETDATE())),

-- Invoice 4: phẫu thuật + XN tiền phẫu = 15,180,000
(4, 4, 4, 15180000, 0, 0, 15180000,
    N'VIET_QR',  N'PAID', 6, DATEADD(DAY,-2,GETDATE()), DATEADD(DAY,-2,GETDATE()), N'ISSUED', DATEADD(DAY,-2,GETDATE()));

SET IDENTITY_INSERT invoices OFF;
GO

-- ============================================================
-- 19. invoice_details
-- ============================================================
SET IDENTITY_INSERT invoice_details ON;

INSERT INTO invoice_details
    (id, invoice_id, item_type, description, unit_price, quantity, sub_total, ref_id, status, created_at)
VALUES
-- Invoice 1: khám (150,000) + OCT (350,000) = 500,000
(1, 1, N'SERVICE',  N'Khám mắt tổng quát',              150000, 1, 150000, 1, N'ACTIVE', DATEADD(DAY,-3,GETDATE())),
(2, 1, N'SERVICE',  N'Chụp OCT võng mạc',               350000, 1, 350000, 4, N'ACTIVE', DATEADD(DAY,-3,GETDATE())),
-- Invoice 2: khám + thuốc = 278,000
(3, 2, N'SERVICE',  N'Khám mắt tổng quát',              150000, 1, 150000, 1, N'ACTIVE', DATEADD(DAY,-3,GETDATE())),
(4, 2, N'MEDICINE', N'Tobramycin 0.3% x 2 lọ',           45000, 2,  90000, 1, N'ACTIVE', DATEADD(DAY,-3,GETDATE())),
(5, 2, N'MEDICINE', N'Dexamethasone 0.1% x 1 lọ',        38000, 1,  38000, 2, N'ACTIVE', DATEADD(DAY,-3,GETDATE())),
-- Invoice 3: đo khúc xạ = 80,000
(6, 3, N'SERVICE',  N'Đo khúc xạ máy',                   80000, 1,  80000, 2, N'ACTIVE', DATEADD(DAY,-3,GETDATE())),
-- Invoice 4: phẫu thuật + XN tiền phẫu = 15,180,000
(7, 4, N'SERVICE',  N'Phẫu thuật đục thủy tinh thể',  15000000, 1, 15000000, 8, N'ACTIVE', DATEADD(DAY,-2,GETDATE())),
(8, 4, N'SERVICE',  N'Xét nghiệm sinh hóa máu cơ bản',  180000, 1,  180000, 7, N'ACTIVE', DATEADD(DAY,-2,GETDATE()));

SET IDENTITY_INSERT invoice_details OFF;
GO

-- ============================================================
-- 20. notifications
-- ============================================================
SET IDENTITY_INSERT notifications ON;

INSERT INTO notifications
    (id, user_id, channel, subject, body,
     ref_type, ref_id, sent_status, sent_at, is_read, read_at, created_at)
VALUES
(1, 10, N'EMAIL',  N'Xác nhận lịch hẹn #6',
    N'Lịch hẹn ngày mai lúc 09:00 với BS. Trần Thị Bình đã được xác nhận. Vui lòng đến đúng giờ.',
    N'appointment', 6, N'SENT', GETDATE(), 1, GETDATE(), GETDATE()),

(2, 11, N'IN_APP', NULL,
    N'Lịch hẹn #7 của bạn đang chờ xác nhận từ phòng khám.',
    N'appointment', 7, N'SENT', GETDATE(), 0, NULL, GETDATE()),

(3, 10, N'IN_APP', NULL,
    N'Hóa đơn #1 đã được thanh toán thành công (500,000 đ). Cảm ơn bạn!',
    N'invoice', 1, N'SENT', GETDATE(), 1, GETDATE(), GETDATE()),

(4, 14, N'SMS',    N'Nhắc lịch hẹn',
    N'[ECMS] Nhắc nhở: Bạn có lịch hẹn vào hôm qua lúc 13:00. Vui lòng liên hệ nếu cần đặt lại.',
    N'appointment', 5, N'SENT', GETDATE(), 0, NULL, GETDATE()),

(5, 13, N'EMAIL',  N'Kết quả phẫu thuật đục thủy tinh thể',
    N'Hồ sơ bệnh án sau phẫu thuật của bạn đã được cập nhật. Vui lòng tái khám sau 1 tuần.',
    N'medical_record', 4, N'SENT', GETDATE(), 0, NULL, GETDATE());

SET IDENTITY_INSERT notifications OFF;
GO

-- ============================================================
-- 21. feedbacks
-- ============================================================
SET IDENTITY_INSERT feedbacks ON;

INSERT INTO feedbacks
    (id, patient_id, appointment_id, doctor_id,
     rating, content, is_anonymous, status, created_at)
VALUES
(1, 1, 1, 1, 5,
    N'Bác sĩ rất tận tâm, giải thích rõ ràng. Phòng khám sạch sẽ, nhân viên thân thiện. Rất hài lòng!',
    0, N'APPROVED', DATEADD(DAY,-2,GETDATE())),

(2, 2, 2, 1, 4,
    N'Bác sĩ khám kỹ, dặn dò chi tiết. Chờ hơi lâu nhưng chấp nhận được.',
    0, N'APPROVED', DATEADD(DAY,-2,GETDATE())),

(3, 4, 4, 3, 5,
    N'Ca phẫu thuật diễn ra thuận lợi, ê-kíp rất chuyên nghiệp. Phục hồi thị lực tốt sau 1 ngày.',
    1, N'PENDING', DATEADD(DAY,-1,GETDATE()));

SET IDENTITY_INSERT feedbacks OFF;
GO

-- ============================================================
-- 22. blog_posts  (author_id → bác sĩ user_id 3, 4, 5)
-- ============================================================
SET IDENTITY_INSERT blog_posts ON;

INSERT INTO blog_posts
    (id, title, slug, content, author_id, status, published_at, created_at)
VALUES
(1, N'5 Dấu hiệu cảnh báo bệnh tăng nhãn áp bạn không nên bỏ qua',
    N'5-dau-hieu-canh-bao-tang-nhan-ap',
    N'Tăng nhãn áp thường được gọi là "kẻ trộm thị giác" vì tiến triển âm thầm. Chú ý 5 dấu hiệu: (1) Mờ mắt thoáng qua, (2) Đau đầu phía trán, (3) Nhìn thấy quầng sáng quanh đèn, (4) Thu hẹp thị trường ngoại vi, (5) Buồn nôn kèm đau mắt. Khám nhãn áp định kỳ là cách phát hiện sớm hiệu quả nhất.',
    3, N'PUBLISHED', DATEADD(DAY,-10,GETDATE()), DATEADD(DAY,-12,GETDATE())),

(2, N'Kính áp tròng: Những điều cần biết để bảo vệ mắt',
    N'kinh-ap-trong-nhung-dieu-can-biet',
    N'Kính áp tròng tiện lợi nhưng sử dụng sai cách rất nguy hiểm. Nguyên tắc vàng: (1) Rửa tay trước khi đeo/tháo, (2) Không đeo khi ngủ, (3) Không dùng nước máy thay nước muối rửa kính, (4) Thay kính đúng chu kỳ, (5) Tháo ngay khi mắt đỏ hoặc đau.',
    4, N'PUBLISHED', DATEADD(DAY,-5,GETDATE()), DATEADD(DAY,-7,GETDATE())),

(3, N'Phẫu thuật Phaco điều trị đục thể thủy tinh — Quy trình và kết quả',
    N'phau-thuat-phaco-duc-the-thuy-tinh',
    N'Đục thể thủy tinh là nguyên nhân hàng đầu gây mù lòa có thể phòng ngừa. Phẫu thuật Phaco chỉ mất 15-20 phút, không cần nằm viện, bệnh nhân phục hồi thị lực trong 24-48 giờ. Bài viết này giải thích chi tiết quy trình và những điều cần chuẩn bị.',
    5, N'DRAFT', NULL, DATEADD(DAY,-1,GETDATE()));

SET IDENTITY_INSERT blog_posts OFF;
GO

-- ============================================================
-- 23. refresh_tokens
-- ============================================================
SET IDENTITY_INSERT refresh_tokens ON;

INSERT INTO refresh_tokens
    (id, user_id, token_hash, device_info, expires_at, created_at)
VALUES
(1, 1,
    N'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    N'Chrome 124 / Windows 11', DATEADD(DAY,7,GETDATE()), GETDATE()),
(2, 3,
    N'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
    N'Firefox 125 / macOS',     DATEADD(DAY,7,GETDATE()), GETDATE()),
(3, 10,
    N'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    N'Chrome 124 / Android 14', DATEADD(DAY,7,GETDATE()), GETDATE());

SET IDENTITY_INSERT refresh_tokens OFF;
GO

-- ============================================================
-- 24. password_reset_tokens
-- ============================================================
SET IDENTITY_INSERT password_reset_tokens ON;

INSERT INTO password_reset_tokens
    (id, user_id, token_hash, type, expires_at, used_at, created_at)
VALUES
-- Token đã dùng
(1, 11,
    N'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
    N'PASSWORD_RESET',
    DATEADD(HOUR,1,DATEADD(DAY,-2,GETDATE())),
    DATEADD(MINUTE,15,DATEADD(DAY,-2,GETDATE())),
    DATEADD(DAY,-2,GETDATE())),
-- Token còn hiệu lực (email verify)
(2, 12,
    N'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
    N'EMAIL_VERIFY',
    DATEADD(HOUR,24,GETDATE()),
    NULL,
    GETDATE());

SET IDENTITY_INSERT password_reset_tokens OFF;
GO

-- ============================================================
-- 25. audit_logs
-- ============================================================
SET IDENTITY_INSERT audit_logs ON;

INSERT INTO audit_logs
    (id, user_id, action, entity_type, entity_id,
     old_value, new_value, ip_address, created_at)
VALUES
(1, 1,  N'CREATE', N'users',           14,
    NULL,
    N'{"email":"patient5@gmail.com","role":"PATIENT","status":"ACTIVE"}',
    N'192.168.1.1',  DATEADD(DAY,-7,GETDATE())),

(2, 6,  N'UPDATE', N'appointments',     8,
    N'{"status":"PENDING"}',
    N'{"status":"CANCELLED","cancel_reason":"Bệnh nhân bận việc đột xuất"}',
    N'192.168.1.10', GETDATE()),

(3, 3,  N'UPDATE', N'medical_records',  1,
    N'{"status":"IN_PROGRESS"}',
    N'{"status":"COMPLETED","locked_by":3}',
    N'192.168.1.20', DATEADD(DAY,-3,GETDATE())),

(4, 8,  N'UPDATE', N'prescriptions',    2,
    N'{"status":"PENDING"}',
    N'{"status":"DISPENSED","dispensed_by":8}',
    N'192.168.1.30', DATEADD(DAY,-3,GETDATE())),

(5, 1,  N'UPDATE', N'system_configs',   1,
    N'{"config_value":"30"}',
    N'{"config_value":"30"}',
    N'192.168.1.1',  DATEADD(DAY,-1,GETDATE()));

SET IDENTITY_INSERT audit_logs OFF;
GO

-- ============================================================
-- 26. backup_logs
-- ============================================================
SET IDENTITY_INSERT backup_logs ON;

INSERT INTO backup_logs
    (id, backup_name, file_path, type, status, size_bytes, created_by, created_at)
VALUES
(1, N'ecms_backup_scheduled_20260528',
    N'D:\Backups\ecms_backup_scheduled_20260528.bak',
    N'SCHEDULED', N'SUCCESS', 524288000, 1, DATEADD(DAY,-3,GETDATE())),

(2, N'ecms_backup_manual_20260601',
    N'D:\Backups\ecms_backup_manual_20260601.bak',
    N'MANUAL',    N'SUCCESS', 531000000, 1, GETDATE());

SET IDENTITY_INSERT backup_logs OFF;
GO

-- ============================================================
-- 27. blogs  (bài viết trang chủ)
-- ============================================================
SET IDENTITY_INSERT blogs ON;

INSERT INTO blogs
    (id, title, summary, content, author, category, image_url, published_at, status)
VALUES
(1, N'5 Dấu hiệu cảnh báo bệnh tăng nhãn áp bạn không nên bỏ qua',
    N'Tăng nhãn áp thường được gọi là kẻ trộm thị giác vì tiến triển âm thầm.',
    N'Tăng nhãn áp thường được gọi là "kẻ trộm thị giác" vì tiến triển âm thầm. Chú ý 5 dấu hiệu: (1) Mờ mắt thoáng qua, (2) Đau đầu phía trán, (3) Nhìn thấy quầng sáng quanh đèn, (4) Thu hẹp thị trường ngoại vi, (5) Buồn nôn kèm đau mắt. Khám nhãn áp định kỳ là cách phát hiện sớm hiệu quả nhất.',
    N'BS. Nguyễn Văn An', N'Nhãn khoa', NULL, DATEADD(DAY,-10,GETDATE()), N'PUBLISHED'),

(2, N'Kính áp tròng: Những điều cần biết để bảo vệ mắt',
    N'Kính áp tròng tiện lợi nhưng sử dụng sai cách rất nguy hiểm.',
    N'Kính áp tròng tiện lợi nhưng sử dụng sai cách rất nguy hiểm. Nguyên tắc vàng: (1) Rửa tay trước khi đeo/tháo, (2) Không đeo khi ngủ, (3) Không dùng nước máy thay nước muối rửa kính, (4) Thay kính đúng chu kỳ, (5) Tháo ngay khi mắt đỏ hoặc đau.',
    N'BS. Trần Thị Bình', N'Kính áp tròng', NULL, DATEADD(DAY,-5,GETDATE()), N'PUBLISHED'),

(3, N'Phẫu thuật Phaco điều trị đục thể thủy tinh — Quy trình và kết quả',
    N'Đục thể thủy tinh là nguyên nhân hàng đầu gây mù lòa có thể phòng ngừa.',
    N'Đục thể thủy tinh là nguyên nhân hàng đầu gây mù lòa có thể phòng ngừa. Phẫu thuật Phaco chỉ mất 15-20 phút, không cần nằm viện, bệnh nhân phục hồi thị lực trong 24-48 giờ. Bài viết này giải thích chi tiết quy trình và những điều cần chuẩn bị.',
    N'BS. Lê Minh Châu', N'Phẫu thuật', NULL, NULL, N'DRAFT');

SET IDENTITY_INSERT blogs OFF;
GO

-- ============================================================
-- 28. clinic_services  (danh mục dịch vụ cho trang chủ)
-- ============================================================
SET IDENTITY_INSERT clinic_services ON;

INSERT INTO clinic_services
    (id, service_name, description, price, duration_minutes)
VALUES
(1, N'Khám mắt tổng quát',             N'Khám sức khỏe mắt toàn diện, kiểm tra thị lực và áp suất nhãn cầu.',   150000,  30),
(2, N'Đo khúc xạ máy',                 N'Đo độ cận viễn loạn bằng máy tự động.',                                  80000,  15),
(3, N'Soi đáy mắt',                    N'Kiểm tra võng mạc và dây thần kinh thị giác.',                           200000,  20),
(4, N'Chụp OCT võng mạc',              N'Chụp cắt lớp kết hợp quang học để đánh giá võng mạc.',                  350000,  25),
(5, N'Đo nhãn áp',                     N'Đo áp suất trong mắt để sàng lọc tăng nhãn áp.',                         60000,  10),
(6, N'Chụp bản đồ giác mạc (Topo)',    N'Phân tích hình thái giác mạc bằng máy Topographer.',                    250000,  20),
(7, N'Xét nghiệm sinh hóa máu cơ bản',N'Xét nghiệm đường huyết, mỡ máu phục vụ tiền phẫu.',                    180000,  60),
(8, N'Phẫu thuật đục thủy tinh thể',   N'Phẫu thuật Phaco thay thể thủy tinh nhân tạo.',                      15000000,  90);

SET IDENTITY_INSERT clinic_services OFF;
GO

PRINT N'';
PRINT N'=== ECMS FULL SCRIPT HOÀN TẤT ===';
PRINT N'';
PRINT N'PHẦN 1 — Cấu trúc CSDL (30 bảng):';
PRINT N'  roles, users, user_roles, refresh_tokens, password_reset_tokens';
PRINT N'  patients, doctors, staffs, doctor_schedules, services';
PRINT N'  appointments, medical_records, prescriptions, medicines, prescription_items';
PRINT N'  glasses_orders, lab_orders, lab_order_items, lab_results, service_assignments';
PRINT N'  invoices, invoice_details, notifications, feedbacks, blog_posts';
PRINT N'  audit_logs, system_configs, backup_logs, blogs, clinic_services';
PRINT N'';
PRINT N'PHẦN 2 — Dữ liệu mẫu:';
PRINT N'  users              : 14 (1 admin, 1 manager, 3 bác sĩ, 2 lễ tân, 1 dược sĩ, 1 lab tech, 5 bệnh nhân)';
PRINT N'  doctors            : 3  | staffs             : 4  | patients           : 5';
PRINT N'  services           : 8  | doctor_schedules   : 11 | medicines          : 6';
PRINT N'  appointments       : 11 (4 COMPLETED, 1 IN_PROGRESS, 1 CONFIRMED, 2 PENDING, 1 CANCELLED, 2 hôm nay)';
PRINT N'  medical_records    : 4  | prescriptions      : 3  | prescription_items : 2';
PRINT N'  glasses_orders     : 1  | lab_orders         : 3  | lab_results        : 2';
PRINT N'  lab_order_items    : 3  | service_assignments: 2';
PRINT N'  invoices           : 4 (tổng 15,958,000 đ — tất cả PAID)';
PRINT N'  invoice_details    : 8  | notifications      : 5  | feedbacks          : 3';
PRINT N'  blog_posts         : 3 (2 PUBLISHED, 1 DRAFT)';
PRINT N'  refresh_tokens     : 3  | password_reset_tokens: 2';
PRINT N'  audit_logs         : 5  | backup_logs        : 2';
PRINT N'  blogs              : 3 (2 PUBLISHED, 1 DRAFT) | clinic_services : 8';
PRINT N'';
PRINT N'  Mật khẩu tất cả tài khoản: Password@123';
GO
