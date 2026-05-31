# 🏥 ECMS — Eyes Clinic Management System

> **Hệ thống Quản lý Phòng khám Nhãn Khoa Ánh Sao**  
> Phòng khám Nhãn khoa Công nghệ cao Ánh Sao — 85 P. Bà Triệu, Q. Hai Bà Trưng, Hà Nội

[![Java](https://img.shields.io/badge/Java-17-orange?logo=java)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-brightgreen?logo=springboot)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-purple?logo=vite)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.x-blue?logo=mysql)](https://www.mysql.com/)
[![Version](https://img.shields.io/badge/Version-2.0-blue)](.)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📋 Mục lục

- [Giới thiệu](#-giới-thiệu)
- [Tính năng chính](#-tính-năng-chính)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt & Chạy dự án](#-cài-đặt--chạy-dự-án)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Cơ sở dữ liệu](#-cơ-sở-dữ-liệu)
- [API Documentation](#-api-documentation)
- [Use Cases](#-use-cases)
- [Phân quyền người dùng](#-phân-quyền-người-dùng)
- [Quy tắc nghiệp vụ](#-quy-tắc-nghiệp-vụ)
- [Non-Functional Requirements](#-non-functional-requirements)
- [Nhóm phát triển](#-nhóm-phát-triển)

---

## 🎯 Giới thiệu

**ECMS (Eyes Clinic Management System)** là ứng dụng web full-stack giúp số hoá toàn bộ quy trình vận hành của Phòng khám Nhãn khoa Ánh Sao. Hệ thống bao gồm toàn bộ vòng đời bệnh nhân:

```
Đặt lịch hẹn → Tiếp nhận → Khám bệnh → Xét nghiệm → Kê đơn → Xuất thuốc → Thanh toán → Báo cáo
```

Hệ thống phục vụ **9 nhóm người dùng** (Guest, Patient, Receptionist, Doctor, Lab Technician, Pharmacist, Clinic Manager, Admin) với phân quyền RBAC đầy đủ.

---

## ✨ Tính năng chính

### Module 1 — Authentication & Authorization
- Đăng ký / Đăng nhập bằng email + mật khẩu (bcrypt)
- Google OAuth 2.0 (Should Have)
- RBAC với 7 roles: Admin, Manager, Doctor, Receptionist, Pharmacist, Patient, Lab Technician
- JWT Access Token (60 phút) + Refresh Token (7 ngày)
- Khóa tài khoản sau 5 lần đăng nhập sai trong 30 phút

### Module 2 — Patient Management
- CRUD hồ sơ bệnh nhân (họ tên, ngày sinh, giới tính, địa chỉ, SĐT, CCCD)
- Tìm kiếm bệnh nhân theo tên, SĐT, mã bệnh nhân
- Lịch sử khám bệnh toàn diện

### Module 3 — Appointment Management
- Đặt lịch khám trực tuyến (chọn bác sĩ, ngày, giờ)
- Tiếp nhận bệnh nhân walk-in tại quầy
- Lễ tân xác nhận / từ chối / đổi lịch
- Tự động nhắc lịch qua email 24 giờ trước khi khám

### Module 4 — EMR & Clinical
- Lập hồ sơ bệnh án điện tử (EMR) đầy đủ thông số nhãn khoa:
  - Thị lực không kính (VA) / Thị lực có kính (BCVA)
  - Số kính: SPH / CYL / AXIS
  - Nhãn áp (IOP), tình trạng đáy mắt
- Kê đơn thuốc & toa kính điện tử
- Auto-save nháp mỗi 2 phút
- EMR bị khoá sau khi hoàn tất (audit-protected)

### Module 5 — Laboratory & Diagnostics (LIS)
- Bác sĩ chỉ định xét nghiệm (khúc xạ, OCT, ảnh đáy mắt)
- Kỹ thuật viên nhập kết quả, upload ảnh
- Kết quả đồng bộ real-time vào EMR (< 5 giây)

### Module 6 — Pharmacy
- Dược sĩ nhận đơn thuốc từ bác sĩ
- Xác nhận cấp phát thuốc theo đúng đơn thuốc đã kê của bác sĩ
- Phát hành hóa đơn dược điện tử

### Module 7 — Billing & Invoice
- Tự động tổng hợp phí: khám + xét nghiệm + thuốc/kính
- Thanh toán tiền mặt hoặc QR Code (VietQR)
- Phát hành hóa đơn điện tử PDF, gửi email
- Lịch sử thanh toán & hóa đơn

### Module 8 — Reports & Analytics
- Báo cáo doanh thu theo ngày / tuần / tháng / năm, xuất Excel
- Thống kê lượt khám, bệnh nhân mới, tỷ lệ bệnh theo loại
- Dashboard real-time cho Clinic Manager
- Báo cáo thống kê tần suất kê đơn và tiêu thụ dược phẩm
- Theo dõi hiệu suất nhân sự

### Module 9 — System Administration
- Quản lý tài khoản người dùng, gán role
- Cấu hình danh mục: dịch vụ, bảng giá, thuốc, phòng khám
- Phân quyền RBAC linh hoạt
- Audit Log đầy đủ (append-only)
- Backup tự động và thủ công, khôi phục dữ liệu

### AI Chatbot (ECMS-Bot)
- Hỗ trợ bệnh nhân đặt lịch, tra cứu lịch hẹn, hỏi đáp về dịch vụ
- Escalate sang lễ tân khi cần

---

## 🏗 Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                     │
│               ReactJS 18 + Vite 5 + Redux                │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS / REST API / WebSocket
┌─────────────────────────▼───────────────────────────────┐
│              BACKEND — Spring Boot 3.x                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Controllers │  │   Services   │  │  Repositories │  │
│  │  (REST API)  │  │(Business     │  │  (Spring JPA) │  │
│  │              │  │  Logic)      │  │               │  │
│  └──────────────┘  └──────────────┘  └───────┬───────┘  │
│  ┌──────────────┐  ┌──────────────┐          │          │
│  │JWT Security  │  │  Schedulers  │          │          │
│  │Spring SecOps │  │  (Cron Jobs) │          │          │
│  └──────────────┘  └──────────────┘          │          │
└─────────────────────────────────────────────┬┘──────────┘
                                              │
┌─────────────────────────────────────────────▼───────────┐
│                   MySQL 8.x Database                     │
└─────────────────────────────────────────────────────────┘
         │                    │                  │
┌────────▼──────┐   ┌─────────▼───────┐  ┌──────▼──────┐
│  SMTP Service │   │ Google OAuth 2.0 │  │  VietQR /   │
│(Gmail/SendGrid│   │ (Identity Plat.) │  │  Payment GW │
└───────────────┘   └─────────────────┘  └─────────────┘
```

---

## 🛠 Công nghệ sử dụng

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | 18.x |
| **Frontend Build** | Vite | 5.x |
| **State Management** | Redux Toolkit | latest |
| **HTTP Client** | Axios | latest |
| **Routing** | React Router v6 | 6.x |
| **UI Library** | Ant Design / TailwindCSS | latest |
| **Backend** | Java | 17 |
| **Backend Framework** | Spring Boot | 3.x |
| **Security** | Spring Security + JWT | latest |
| **ORM** | Spring Data JPA / Hibernate | latest |
| **Database** | MySQL | 8.x |
| **API Docs** | Swagger / OpenAPI 3.0 | latest |
| **Email** | Gmail SMTP / SendGrid | — |
| **PDF Generator** | iText / JasperReports | latest |
| **Build Tool** | Maven | 3.x |
| **Containerization** | Docker (optional) | latest |

---

## 💻 Yêu cầu hệ thống

### Phần mềm cần thiết

```
- Node.js        >= 18.x
- npm / yarn     >= 9.x
- Java JDK       >= 17
- Maven          >= 3.8
- MySQL Server   >= 8.0
- Git            >= 2.x
```

### Phần cứng khuyến nghị (Development)

```
- RAM:  >= 8 GB
- CPU:  >= 4 cores
- Disk: >= 20 GB free
```

---

## 🚀 Cài đặt & Chạy dự án

### 1. Clone repository

```bash
git clone https://github.com/<your-org>/ecms.git
cd ecms
```

### 2. Cấu hình Database

```sql
-- Tạo database
CREATE DATABASE ecms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ecms_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON ecms_db.* TO 'ecms_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Cấu hình Backend

```bash
cd backend
cp src/main/resources/application.example.yml src/main/resources/application.yml
```

Chỉnh sửa `application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/ecms_db?useSSL=false&serverTimezone=Asia/Ho_Chi_Minh
    username: ecms_user
    password: your_password
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false

jwt:
  secret: your_jwt_secret_key_min_256_bits
  access-token-expiration: 3600000    # 60 phút (ms)
  refresh-token-expiration: 604800000  # 7 ngày (ms)

mail:
  host: smtp.gmail.com
  port: 587
  username: your_email@gmail.com
  password: your_app_password

google:
  client-id: your_google_client_id
  client-secret: your_google_client_secret
```

### 4. Chạy Backend

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

Backend sẽ chạy tại: `http://localhost:8080`  
Swagger UI: `http://localhost:8080/swagger-ui.html`

### 5. Cấu hình Frontend

```bash
cd frontend
cp .env.example .env
```

Chỉnh sửa `.env`:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_APP_NAME=ECMS
```

### 6. Chạy Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:5173`

### 7. Chạy với Docker (Tùy chọn)

```bash
# Build và chạy toàn bộ stack
docker-compose up --build

# Chỉ chạy database
docker-compose up -d mysql
```

---

## 📁 Cấu trúc dự án

```
ecms/
├── frontend/                          # ReactJS + Vite
│   ├── public/
│   ├── src/
│   │   ├── components/                # Shared components (Button, Modal, Table...)
│   │   ├── pages/                     # Pages theo module
│   │   │   ├── auth/                  # Login, Register, ForgotPassword
│   │   │   ├── patient/               # Patient Portal, Booking, History
│   │   │   ├── receptionist/          # Appointment Management, Invoice
│   │   │   ├── doctor/                # EMR, Prescription, Lab Order
│   │   │   ├── lab/                   # Lab Queue, Result Entry
│   │   │   ├── pharmacy/              # Dispensing
│   │   │   ├── manager/               # Reports, Dashboard, Analytics
│   │   │   └── admin/                 # User Management, System Config
│   │   ├── services/                  # Axios API calls + interceptors
│   │   ├── store/                     # Redux Toolkit slices
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── utils/                     # Helper functions, validators
│   │   ├── routes/                    # React Router v6, ProtectedRoute
│   │   └── App.jsx
│   ├── .env.example
│   ├── vite.config.js
│   └── package.json
│
├── backend/                           # Spring Boot
│   └── src/main/java/com/eyesclinic/
│       ├── controller/                # REST Controllers
│       │   ├── AuthController.java
│       │   ├── PatientController.java
│       │   ├── AppointmentController.java
│       │   ├── EMRController.java
│       │   ├── PrescriptionController.java
│       │   ├── LabController.java
│       │   ├── PharmacyController.java
│       │   ├── InvoiceController.java
│       │   ├── ReportController.java
│       │   └── AdminController.java
│       ├── service/                   # Business Logic (interface + impl)
│       ├── repository/                # Spring Data JPA repositories
│       ├── entity/                    # JPA Entity classes
│       ├── dto/                       # Request / Response DTOs
│       ├── security/                  # JWT filter, Spring Security, RBAC
│       ├── scheduler/                 # Cron jobs (reminder, report)
│       ├── config/                    # CORS, Swagger, Email config
│       └── exception/                 # Global exception handler
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── application.example.yml
│   └── pom.xml
│
├── docs/                              # Tài liệu dự án
│   ├── ECMS_SRS.docx
│   ├── ECMS_RDS.docx
│   ├── ECMS_UseCase_Specifications.docx
│   └── database/
│       └── ecms_schema.sql
│
├── docker-compose.yml
└── README.md
```

---

## 📌 Use Cases

### Actors

| # | Actor | Mô tả |
|---|-------|-------|
| 1 | **Guest** | Khách chưa đăng nhập, chỉ xem trang công khai |
| 2 | **User** | Base role cho mọi tài khoản đã xác thực |
| 3 | **Patient** | Bệnh nhân — đặt lịch, xem EMR & đơn thuốc của bản thân |
| 4 | **Receptionist** | Lễ tân — tiếp nhận, quản lý lịch hẹn, thu phí |
| 5 | **Lab Technician** | Kỹ thuật viên — nhận chỉ định, nhập kết quả xét nghiệm |
| 6 | **Doctor** | Bác sĩ — lập EMR, kê đơn, chỉ định xét nghiệm |
| 7 | **Pharmacist** | Dược sĩ — xuất thuốc, phát hành hóa đơn dược |
| 8 | **Clinic Manager** | Quản lý phòng khám — báo cáo, thống kê, giám sát nhân sự |
| 9 | **Admin** | Quản trị viên — toàn quyền cấu hình hệ thống |

---

### Danh sách Use Cases

#### 🔐 Authentication & Account Management

| UC ID | Use Case | Actors | Priority |
|-------|----------|--------|----------|
| UC-01 | Register New Account | Guest | Must Have |
| UC-02 | View Home Page | All | Must Have |
| UC-03 | View Blog List | All | Should Have |
| UC-04 | Log In to System | All authenticated | Must Have |
| UC-05 | Log Out of System | All authenticated | Must Have |
| UC-06 | Reset Forgotten Password | User | Must Have |
| UC-07 | Change Account Password | All authenticated | Must Have |
| UC-08 | Manage Personal Profile | All authenticated | Must Have |
| UC-09 | Receive System Notification | Patient, Receptionist, Doctor, Pharmacist, Lab Tech, Manager | Must Have |
| UC-10 | Interact with AI Chatbot (ECMS-Bot) | Patient | Should Have |

#### 📅 Reception & Scheduling

| UC ID | Use Case | Actors | Priority |
|-------|----------|--------|----------|
| UC-11 | Book Appointment Online | Patient | Must Have |
| UC-12 | Manage Patient's Appointment | Patient, Receptionist | Must Have |
| UC-13 | Register Walk-in Patient | Receptionist | Must Have |
| UC-14 | Confirm and Assign Appointment to Doctor | Receptionist | Must Have |
| UC-15 | View Daily Appointment Schedule | Receptionist, Doctor, Manager | Must Have |
| UC-16 | Collect Examination Fee and Issue Invoice | Receptionist | Must Have |
| UC-17 | Print or Send Electronic Invoice | Receptionist, Patient | Must Have |
| UC-18 | Send Appointment Reminder Notification | System (Cron), Receptionist | Should Have |

#### 🩺 EMR & Clinical

| UC ID | Use Case | Actors | Priority |
|-------|----------|--------|----------|
| UC-19 | Manage Electronic Medical Record (EMR) | Doctor | Must Have |
| UC-20 | Record and Submit Visual Acuity Test Results | Lab Technician | Must Have |
| UC-21 | Issue Drug Prescription | Doctor | Must Have |
| UC-22 | View Patient Medical History | Doctor, Patient | Must Have |
| UC-23 | View Lab Queue | Lab Technician | Must Have |
| UC-24 | View Lab Results | Patient, Doctor | Must Have |

#### 🔬 LIS & Imaging

| UC ID | Use Case | Actors | Priority |
|-------|----------|--------|----------|
| UC-25 | Review Submitted Lab Results | Doctor | Must Have |

#### 💊 Pharmacy

| UC ID | Use Case | Actors | Priority |
|-------|----------|--------|----------|
| UC-26 | Receive & Dispense Drug Prescription | Pharmacist | Must Have |
| UC-27 | Issue Electronic Invoice (Pharmacy) | Pharmacist | Must Have |

#### 🖥 Patient Portal

| UC ID | Use Case | Actors | Priority |
|-------|----------|--------|----------|
| UC-28 | View Electronic Prescriptions and Eyeglass | Patient | Must Have |
| UC-29 | View Diagnostic Results | Patient | Must Have |
| UC-30 | Register for Eye Care Services | Patient | Should Have |
| UC-31 | Generate feedback | Patient | Should Have |

#### 📊 Administration & Analytics

| UC ID | Use Case | Actors | Priority |
|-------|----------|--------|----------|
| UC-32 | Generate Revenue Report | Clinic Manager | Must Have |
| UC-33 | View Patient Volume Statistics and Trends | Clinic Manager | Should Have |
| UC-34 | Monitor Staff Performance Dashboard | Clinic Manager | Should Have |
| UC-35 | View Real-time Operational Analytics Dashboard | Clinic Manager | Must Have |
| UC-36 | Generate Feedback Report | Clinic Manager | Should Have |

#### ⚙️ System Admin & Security

| UC ID | Use Case | Actors | Priority |
|-------|----------|--------|----------|
| UC-37 | Manage User Account | Admin | Must Have |
| UC-38 | Configure System and Data | Admin | Must Have |
| UC-39 | Manage System Audit Log | Admin | Must Have |

---

## 🗄 Cơ sở dữ liệu

> **Database:** SQL Server — kết nối qua SSMS. Toàn bộ schema chi tiết (fields, types, constraints, indexes) xem tại `ECMS_Database_Table_SQLServer.pdf`.

### Danh sách bảng (28 bảng)

#### Nhóm Xác thực & Người dùng

| # | Bảng | Mô tả | PK | FK chính |
|---|------|-------|----|----|
| 1 | `roles` | Danh mục vai trò (ADMIN, DOCTOR, PATIENT...) | id | — |
| 2 | `users` | Tài khoản người dùng. Có `failed_login_count` + `locked_until` để xử lý BR-02 | id | — |
| 3 | `user_roles` | Junction table user ↔ role (nhiều-nhiều) | (user_id, role_id) | users, roles |
| 4 | `refresh_tokens` | Lưu hash Refresh Token (7 ngày). Dùng để thu hồi token khi logout | id | users |
| 5 | `password_reset_tokens` | Token đặt lại mật khẩu & xác thực email có thời hạn. Dùng cho UC-06 | id | users |

#### Nhóm Hồ sơ Nhân sự & Lịch làm việc

| # | Bảng | Mô tả | PK | FK chính |
|---|------|-------|----|----|
| 6 | `patients` | Hồ sơ bệnh nhân (mã BN, CCCD, nhóm máu, dị ứng, liên hệ khẩn cấp) | id | users |
| 7 | `doctors` | Thông tin bác sĩ, chuyên khoa, `license_number` (bắt buộc cho BR-06) | id | users |
| 8 | `staffs` | Hồ sơ nhân viên không phải bác sĩ (Receptionist, Pharmacist, Lab Tech, Manager) | id | users |
| 9 | `doctor_schedules` | Ca trực của bác sĩ theo ngày, giờ, số slot tối đa. Dùng cho BR-03, BR-15 | id | doctors |

#### Nhóm Danh mục & Lịch hẹn

| # | Bảng | Mô tả | PK | FK chính |
|---|------|-------|----|----|
| 10 | `services` | Danh mục dịch vụ & bảng giá. Flag `is_lab_service` phân biệt dịch vụ xét nghiệm | id | — |
| 11 | `appointments` | Lịch hẹn khám. Có `queue_number` (BR-13), `service_id`, `check_in_by` | id | patients, doctors, services, users |

#### Nhóm Khám bệnh & Kê đơn

| # | Bảng | Mô tả | PK | FK chính |
|---|------|-------|----|----|
| 12 | `medical_records` | Hồ sơ bệnh án điện tử (EMR). Lưu thị lực, nhãn áp, chẩn đoán. Bị khoá sau khi hoàn tất | id | appointments, patients, doctors |
| 13 | `prescriptions` | Đơn thuốc/kính điện tử. `type`: MEDICINE / GLASSES / BOTH. BR-06: chỉ bác sĩ có license | id | medical_records, users |
| 14 | `medicines` | Danh mục thuốc, đơn giá niêm yết (BR-11) | id | — |
| 15 | `prescription_items` | Chi tiết từng thuốc trong đơn. Snapshot `unit_price` tại thời điểm kê | id | prescriptions, medicines |
| 16 | `glasses_orders` | Đơn kính điện tử (SPH/CYL/AXIS, PD, loại tròng, phủ). Trạng thái đến IN_PRODUCTION | id | prescriptions, users |

#### Nhóm Xét nghiệm

| # | Bảng | Mô tả | PK | FK chính |
|---|------|-------|----|----|
| 17 | `lab_orders` | Phiếu chỉ định xét nghiệm. Có `priority`: NORMAL / URGENT | id | medical_records, users |
| 18 | `lab_order_items` | Chi tiết từng loại xét nghiệm trong phiếu → liên kết với `services` | id | lab_orders, services |
| 19 | `lab_results` | Kết quả xét nghiệm, ảnh đính kèm (OCT, ảnh đáy mắt). Có bước doctor review | id | lab_orders, users |
| 20 | `service_assignments` | Gán kết quả xét nghiệm với dịch vụ tương ứng | id | lab_results, services |

#### Nhóm Thanh toán & Hóa đơn

| # | Bảng | Mô tả | PK | FK chính |
|---|------|-------|----|----|
| 21 | `invoices` | Hóa đơn thanh toán. Có `payment_method` (CASH/VIET_QR), `payment_reference` cho QR | id | appointments, patients, users |
| 22 | `invoice_details` | Chi tiết dòng hóa đơn theo `item_type`: SERVICE / MEDICINE / GLASSES / OTHER | id | invoices |

#### Nhóm Tương tác & Nội dung

| # | Bảng | Mô tả | PK | FK chính |
|---|------|-------|----|----|
| 23 | `notifications` | Thông báo hệ thống. Hỗ trợ kênh EMAIL / IN_APP / SMS. Có `is_read`, `read_at` | id | users |
| 24 | `feedbacks` | Đánh giá của bệnh nhân (1–5 sao). Duyệt trước khi hiển thị | id | patients, appointments, doctors |
| 25 | `blog_posts` | Bài viết kiến thức chăm sóc mắt. Có SEO slug, trạng thái DRAFT/PUBLISHED | id | users |

#### Nhóm Hệ thống & Quản trị

| # | Bảng | Mô tả | PK | FK chính |
|---|------|-------|----|----|
| 26 | `audit_logs` | Nhật ký truy cập và thay đổi dữ liệu nhạy cảm (append-only). BR-14, Nghị định 13/2023 | id | users |
| 27 | `system_configs` | Cấu hình hệ thống dạng key-value (vd: MAX_APPOINTMENTS_PER_DAY). Module 9 | id | users |
| 28 | `backup_logs` | Lịch sử backup thủ công và tự động, có trạng thái và thông tin restore | id | users |

---

### Trạng thái dữ liệu chính

```
Appointment:    PENDING → CONFIRMED → IN_PROGRESS → COMPLETED → CANCELLED
EMR:            DRAFT → IN_PROGRESS → COMPLETED (locked)
Lab Order:      PENDING → IN_PROGRESS → COMPLETED | CANCELLED
Lab Result:     PENDING → COMPLETED → REVIEWED
Prescription:   PENDING → IN_PREPARATION → DISPENSED | SKIPPED
Glasses Order:  PENDING → IN_PRODUCTION → READY → DISPENSED | CANCELLED
Invoice:        DRAFT → ISSUED → CANCELLED  |  payment_status: UNPAID → PAID | PAYMENT_FAILED
Notification:   sent_status: PENDING → SENT | FAILED
Feedback:       PENDING → APPROVED | HIDDEN
Blog Post:      DRAFT → PUBLISHED → ARCHIVED
```

---

### Lưu ý kỹ thuật

| Điểm | Mô tả |
|------|-------|
| `invoice_details.ref_id` | Polymorphic FK — trỏ đến `service_id`, `medicine_id` hoặc `glasses_orders.id` tùy `item_type`. SQL Server không enforce FK constraint cho cột polymorphic → **bắt buộc validate ở tầng Service/Application** |
| `service_assignments` | Gán lab result với service. Cần làm rõ use case — nếu không có nghiệp vụ độc lập thì xem xét loại bỏ vì đã có `lab_order_items.service_id` |

---

## 📡 API Documentation

Sau khi chạy backend, truy cập Swagger UI để xem toàn bộ API:

```
http://localhost:8080/swagger-ui.html
```

### Nhóm API chính

| Prefix | Mô tả |
|--------|-------|
| `POST /api/v1/auth/**` | Đăng ký, đăng nhập, refresh token, đổi mật khẩu |
| `GET/POST/PUT /api/v1/patients/**` | Quản lý hồ sơ bệnh nhân |
| `GET/POST/PUT /api/v1/appointments/**` | Quản lý lịch hẹn |
| `GET/POST/PUT /api/v1/emr/**` | Hồ sơ bệnh án điện tử |
| `GET/POST /api/v1/lab/**` | Chỉ định & kết quả xét nghiệm |
| `GET/POST/PUT /api/v1/prescriptions/**` | Kê đơn & xuất thuốc |
| `GET/POST /api/v1/invoices/**` | Hóa đơn & thanh toán |
| `GET /api/v1/reports/**` | Báo cáo doanh thu & thống kê |
| `GET/POST/PUT /api/v1/admin/**` | Quản trị hệ thống |

### Xác thực

Tất cả API (trừ `/auth/**`) yêu cầu JWT trong header:

```http
Authorization: Bearer <access_token>
```

---

## 🔐 Phân quyền người dùng

| Màn hình | Patient | Receptionist | Doctor | Lab Tech | Pharmacist | Manager | Admin |
|----------|:-------:|:------------:|:------:|:--------:|:----------:|:-------:|:-----:|
| Login / Register | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Home / Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Personal Profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Booking Appointment | ✅ | — | — | — | — | — | — |
| Appointment Management | 👁️ | ✅ | 👁️ | — | — | 👁️ | ✅ |
| EMR | 👁️ | — | ✅ | 👁️ | 👁️ | 👁️ | meta |
| Prescription | 👁️ | — | ✅ | — | 👁️ | — | — |
| Lab Order & Result | 👁️ | — | ✅ | ✅ | — | — | — |
| Pharmacy / Dispensing | — | — | — | — | ✅ | — | — |
| Billing & Invoice | 👁️ | ✅ | — | — | — | ✅ | — |
| Reports & Analytics | — | — | — | — | — | ✅ | — |
| User & Role Management | — | — | — | — | — | — | ✅ |
| System Configuration | — | — | — | — | — | — | ✅ |
| Audit Log | — | — | — | — | — | — | ✅ |

> ✅ Toàn quyền | 👁️ Chỉ xem | — Không có quyền

---

## 📏 Quy tắc nghiệp vụ

| BR ID | Danh mục | Tên | Mô tả |
|-------|---------|-----|-------|
| BR-01 | Authentication | Password Policy | Mật khẩu ≥ 8 ký tự, gồm chữ hoa, thường và số |
| BR-02 | Authentication | Account Locking | Khóa tài khoản sau 5 lần sai trong 30 phút |
| BR-03 | Appointment | Max Appointments/Day | Tối đa 30 lịch hẹn/bác sĩ/ngày |
| BR-04 | Appointment | Advance Booking | Đặt lịch trước ≥ 2 giờ so với giờ khám |
| BR-05 | Appointment | Cancellation Deadline | Hủy lịch trước ≥ 1 giờ so với giờ khám |
| BR-06 | Prescription | Prescription Authority | Chỉ bác sĩ có license_number mới được kê đơn |
| BR-07 | Prescription | Prescription Dispensing | Dược sĩ cấp phát thuốc chính xác theo đúng các loại thuốc và số lượng được kê trong đơn thuốc của bác sĩ |
| BR-08 | Data Access | EMR Confidentiality | EMR chỉ bác sĩ phụ trách & bệnh nhân được xem |
| BR-09 | Data | No Hard Delete | Không xóa vật lý — chỉ deactivate bằng cờ status |
| BR-10 | Billing | Invoice Issuance | Hóa đơn chỉ phát hành sau khi thanh toán đủ |
| BR-11 | Prescription | Active Medicine Verification | Thuốc được kê đơn và cấp phát phải tồn tại trong danh mục thuốc hoạt động và có đơn giá được niêm yết trong hệ thống |
| BR-12 | Billing | Invoice Calculation | Tổng = phí khám + phí XN + phí thuốc/kính |
| BR-13 | Queue | Queue Numbering | Mỗi bệnh nhân tiếp nhận thành công vào hàng chờ khám được cấp số thứ tự tăng dần trong ngày theo phòng khám/bác sĩ |
| BR-14 | Privacy | Personal Data Protection | Mọi hành động truy xuất thông tin EMR, xem dữ liệu nhạy cảm phải được ghi nhận lịch sử vào `audit_logs` (Nghị định 13/2023/NĐ-CP) |
| BR-15 | Appointment | Booking Slot Validation | Chỉ cho phép đặt lịch hẹn trực tuyến khớp với ca trực khả dụng và còn trống của bác sĩ trong `doctor_schedules` |

---

## ⚡ Non-Functional Requirements

| Nhóm | Yêu cầu | KPI |
|------|---------|-----|
| **Performance** | API response P95 với 100 concurrent users | < 2 giây |
| **Performance** | Frontend First Contentful Paint trên 4G | FCP < 3s, LCP < 4s, Lighthouse ≥ 80 |
| **Performance** | Throughput backend | ≥ 100 RPS |
| **Performance** | Đồng bộ kết quả XN vào EMR | < 5 giây |
| **Security** | Truyền tải client-server | 100% HTTPS/TLS |
| **Security** | Mã hóa mật khẩu | bcrypt, cost ≥ 12 |
| **Security** | Dữ liệu bệnh nhân at rest | AES-256 |
| **Security** | OWASP Top 10 | 0 lỗ hổng High/Critical |
| **Availability** | Uptime giờ làm việc 7:00–20:00 | ≥ 99.5%/tháng |
| **Availability** | Backup & Recovery | RPO ≤ 24h; RTO ≤ 4h |
| **Scalability** | Concurrent users | ≥ 300 users |
| **Scalability** | Query trên 500K records | < 3 giây với index |
| **Usability** | Responsive UI | Viewport 375px – 1920px |
| **Usability** | Luồng đặt lịch | Hoàn thành < 3 phút |
| **Maintainability** | Unit test coverage (Backend) | ≥ 70% service layer |
| **Maintainability** | API documentation | 100% Swagger/OpenAPI 3.0 |
| **Compliance** | Bảo vệ dữ liệu cá nhân | Nghị định 13/2023/NĐ-CP |

---

## 🔧 Background Jobs (Cron)

| # | Tên | Mô tả | Trigger |
|---|-----|-------|---------|
| 1 | Auto Reminder Job | Gửi email nhắc lịch hẹn trước 24 giờ | Mỗi giờ |
| 2 | Invoice PDF Generator | Sinh file PDF hóa đơn & gửi email | On-demand |
| 3 | Token Refresh Service | Refresh JWT Access Token | On-demand |
| 4 | Monthly Report Generator | Tổng hợp báo cáo tháng trước | Đầu tháng |

---


## 📚 Tài liệu liên quan

- [`ECMS_SRS.docx`](docs/ECMS_SRS.docx) — Software Requirement Specification
- [`ECMS_RDS.docx`](docs/ECMS_RDS.docx) — Requirement & Design Specification
- [`ECMS_UseCase_Specifications.docx`](docs/ECMS_UseCase_Specifications.docx) — Use Case Specifications
- [`ECMS_SDS.docx`](docs/ECMS_SDS.docx) — Software Design Specification
- [Swagger UI](http://localhost:8080/swagger-ui.html) — API Documentation (runtime)

---

## 🚫 Phạm vi ngoài Version 0

Các tính năng sau **không có** trong phiên bản đầu tiên:
- Tích hợp hệ thống BHYT quốc gia
- Telemedicine / Khám từ xa
- Tích hợp thiết bị đo thị lực tự động
- Hỗ trợ chuỗi phòng khám nhiều chi nhánh
- Thanh toán bảo hiểm tư nhân

---

<div align="center">

**ECMS — Eyes Clinic Management System**  
SWP391_2026_04 | FPT University | Hanoi, 2026

</div>