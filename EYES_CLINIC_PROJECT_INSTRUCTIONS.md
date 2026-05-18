# Eyes Clinic Management System — Project Instructions

> **Tên dự án:** Hệ thống Quản lý Phòng khám Nhãn Khoa Ánh Sao  
> **Mã dự án:** SWP391_2026_04  
> **Stack:** ReactJS (Vite) + Java Spring Boot + MySQL  
> **Tài liệu gốc:** Eyes_Clinic_RDS_v1_1.docx (V2.0 — 18/05/2025)  
> **Mục đích file này:** Cung cấp context đầy đủ để mọi câu hỏi kỹ thuật được trả lời nhất quán, không bị đứt quãng, không miss thông tin từ RDS.

---

## 1. Project Overview

Hệ thống quản lý phòng khám nhãn khoa (Eyes Clinic Management System) — ứng dụng Fullstack web phục vụ nghiệp vụ của một phòng khám chuyên khoa mắt.

**Kiến trúc tổng thể:**

```
Frontend (ReactJS + Vite)  <-->  Backend (Spring Boot REST API)  <-->  MySQL Database
```

**Môi trường triển khai:** Cloud (AWS EC2 / Railway / VPS)  
**Authentication:** JWT (Access Token 60 phút, Refresh Token 7 ngày)  
**Authorization:** RBAC với 7 roles

---

## 2. Tech Stack Chi Tiết

### Frontend
- **Framework:** ReactJS + Vite
- **State Management:** Redux Toolkit
- **Routing:** React Router v6 (protected routes theo role)
- **HTTP Client:** Axios (với interceptor)
- **UI:** shadcn/ui hoặc Ant Design (tự quyết định phù hợp với dự án clinic)

### Backend
- **Framework:** Spring Boot
- **ORM:** Spring Data JPA (Hibernate)
- **Security:** Spring Security + JWT
- **Database:** MySQL
- **Docs:** Swagger / OpenAPI 3.0
- **Scheduler:** Spring `@Scheduled` (cron jobs)
- **Email:** JavaMailSender (SMTP)

### Frontend Package Structure
```
src/
├── components/     # Shared components (Button, Modal, Table,...)
├── pages/          # Pages theo module (PatientPage, AppointmentPage,...)
├── services/       # Axios API calls + interceptor
├── store/          # Redux Toolkit slices
├── hooks/          # Custom React hooks
├── utils/          # Helper functions (date, validate,...)
└── routes/         # React Router v6, bảo vệ route theo role
```

### Backend Package Structure
```
com.eyesclinic/
├── controller/     # REST API controllers (AuthController, PatientController,...)
├── service/        # Business logic (interface + impl)
├── repository/     # Spring Data JPA repositories
├── entity/         # JPA Entity classes mapping DB tables
├── dto/            # Request/Response DTOs
├── security/       # JWT filter, Spring Security config, RBAC
├── scheduler/      # Cron jobs (reminder, inventory alert,...)
└── config/         # CORS, Swagger, Email config
```

---

## 3. Actors & Roles

| Role | Mô tả tóm tắt |
|------|----------------|
| **Admin** | Toàn quyền hệ thống: quản lý tài khoản người dùng, phân quyền, cấu hình hệ thống, xem báo cáo tổng quan |
| **Clinic Manager** | Quản lý vận hành phòng khám: xem báo cáo doanh thu, quản lý lịch làm việc bác sĩ, quản lý nhân sự, phê duyệt đơn hàng nhập thuốc/thiết bị |
| **Doctor** | Bác sĩ khám bệnh, kê đơn thuốc kính, lập hồ sơ bệnh án, xem lịch khám, ghi kết quả xét nghiệm thị lực và các kết quả chẩn đoán |
| **Receptionist** | Tiếp nhận bệnh nhân, đăng ký lịch hẹn, thu phí dịch vụ, in hóa đơn, hướng dẫn bệnh nhân tại phòng khám |
| **Pharmacist** | Quản lý tồn kho thuốc và thiết bị quang học, xuất thuốc theo đơn, nhập hàng, kiểm soát hạn sử dụng, cảnh báo tồn kho thấp |
| **Patient** | Đặt lịch hẹn online, xem hồ sơ khám bệnh cá nhân, nhận thông báo nhắc lịch tái khám, xem đơn thuốc/kính |
| **Lab Technician** | Thực hiện xét nghiệm thị lực, đo khúc xạ, chụp ảnh đáy mắt, OCT; nhập kết quả vào hệ thống để bác sĩ đọc |

---

## 4. Use Cases Index (30 UCs)

| UC ID | Module | Use Case | Actor chính |
|-------|--------|----------|-------------|
| UC-01 | Quản lý Bệnh nhân | Đăng ký tài khoản bệnh nhân | Patient |
| UC-02 | Quản lý Bệnh nhân | Đăng nhập hệ thống | Tất cả Actor |
| UC-03 | Quản lý Bệnh nhân | Quản lý hồ sơ cá nhân bệnh nhân | Patient, Receptionist |
| UC-04 | Quản lý Bệnh nhân | Tìm kiếm & tra cứu bệnh nhân | Receptionist, Doctor, Pharmacist |
| UC-05a | Quản lý Bệnh nhân | Lễ tân tạo tài khoản cho bệnh nhân đến trực tiếp chưa có tài khoản | Receptionist |
| UC-05b | Quản lý Lịch hẹn | Đặt lịch hẹn khám trực tuyến | Patient |
| UC-06 | Quản lý Lịch hẹn | Xác nhận & phân công lịch hẹn | Receptionist |
| UC-07 | Quản lý Lịch hẹn | Hủy/Đổi lịch hẹn | Patient, Receptionist |
| UC-08 | Quản lý Lịch hẹn | Nhắc lịch hẹn tự động (Email/SMS) | System |
| UC-09 | Quản lý Lịch hẹn | Quản lý lịch làm việc bác sĩ | Manager, Admin |
| UC-10 | Khám bệnh & EMR | Tiếp nhận bệnh nhân vào khám | Receptionist |
| UC-11 | Khám bệnh & EMR | Lập hồ sơ bệnh án điện tử (EMR) | Doctor |
| UC-12 | Khám bệnh & EMR | Kê đơn thuốc & kính | Doctor |
| UC-13 | Khám bệnh & EMR | Chỉ định xét nghiệm / xét nghiệm thị lực | Doctor |
| UC-14 | Khám bệnh & EMR | Xem lịch sử khám bệnh | Doctor, Patient |
| UC-15 | Xét nghiệm & Chẩn đoán | Nhập kết quả xét nghiệm / đo khúc xạ | Lab Technician |
| UC-16 | Xét nghiệm & Chẩn đoán | Xem & đọc kết quả xét nghiệm | Doctor |
| UC-17 | Xét nghiệm & Chẩn đoán | Bệnh nhân chọn loại gọng kính để cắt | Patient |
| UC-18 | Xét nghiệm & Chẩn đoán | Kỹ thuật viên cắt kính theo thông số bác sĩ + gọng bệnh nhân đã chọn | Lab Technician |
| UC-19 | Xét nghiệm & Chẩn đoán | Quản lý danh mục dịch vụ xét nghiệm | Admin, Manager |
| UC-20 | Thanh toán & Hóa đơn | Tính phí dịch vụ khám & thuốc | Receptionist |
| UC-21 | Thanh toán & Hóa đơn | Xử lý thanh toán (tiền mặt/chuyển khoản) | Receptionist |
| UC-22 | Thanh toán & Hóa đơn | In & gửi hóa đơn điện tử | Receptionist |
| UC-23 | Thanh toán & Hóa đơn | Tra cứu lịch sử thanh toán | Receptionist, Manager, Patient |
| UC-24 | Báo cáo & Thống kê | Báo cáo doanh thu theo ngày/tháng | Manager, Admin |
| UC-25 | Báo cáo & Thống kê | Báo cáo số lượt khám & bệnh nhân | Manager, Admin |
| UC-26 | Báo cáo & Thống kê | Dashboard tổng quan hệ thống | Admin, Manager |
| UC-27 | Quản trị hệ thống | Quản lý tài khoản & phân quyền | Admin |
| UC-28 | Quản trị hệ thống | Cấu hình danh mục hệ thống | Admin |
| UC-29 | Quản trị hệ thống | Quản lý thông tin phòng khám | Admin, Manager |
| UC-30 | Quản trị hệ thống | Xem log hoạt động hệ thống | Admin |

> **Lưu ý:** RDS đã thêm UC-05a (Lễ tân tạo tài khoản walk-in), UC-17 (Patient chọn gọng kính), UC-18 (KTV cắt kính). Bỏ các UC Pharmacy riêng biệt — Pharmacy được xử lý qua luồng liên thông từ Prescription.

---

## 5. Database Schema (14 bảng chính)

> **Quy tắc bất biến:** Không hard delete bất kỳ bảng nào — chỉ dùng `status` flag (BR-09).

| # | Table | Mô tả | PK | FK |
|---|-------|--------|----|----|
| 1 | `users` | Tài khoản người dùng | user_id | role_id |
| 2 | `roles` | Danh mục vai trò hệ thống | role_id | — |
| 3 | `patients` | Hồ sơ bệnh nhân | patient_id | user_id |
| 4 | `doctors` | Thông tin bác sĩ, chuyên khoa | doctor_id | user_id |
| 5 | `appointments` | Lịch hẹn khám | appointment_id | patient_id, doctor_id |
| 6 | `medical_records` | Hồ sơ bệnh án điện tử (EMR) | record_id | appointment_id, doctor_id, patient_id |
| 7 | `prescriptions` | Đơn thuốc | prescription_id | record_id |
| 8 | `prescription_items` | Chi tiết đơn thuốc | item_id | prescription_id, medicine_id |
| 9 | `lab_orders` | Phiếu chỉ định xét nghiệm | order_id | record_id, doctor_id |
| 10 | `lab_results` | Kết quả xét nghiệm | result_id | order_id, lab_tech_id |
| 11 | `medicines` | Danh mục thuốc | medicine_id | — |
| 12 | `invoices` | Hóa đơn thanh toán | invoice_id | appointment_id, patient_id |
| 13 | `invoice_items` | Chi tiết dòng hóa đơn | item_id | invoice_id |
| 14 | `services` | Danh mục dịch vụ & bảng giá | service_id | — |


---

## 6. Screen Authorization Matrix

> X = full access | (xem) = read-only | (cá nhân) = chỉ data của bản thân

| Screen | Admin | Manager | Doctor | Receptionist | Pharmacist | Patient | Lab Tech |
|--------|-------|---------|--------|--------------|------------|---------|----------|
| Đăng ký / Đăng nhập | X | X | X | X | X | X | X |
| Dashboard tổng quan | X | X | — | — | — | — | — |
| Quản lý Bệnh nhân | X | X | X | X | X | X (cá nhân) | — |
| Đặt & Quản lý Lịch hẹn | X | X | X (xem) | X | — | X | — |
| Tiếp nhận Bệnh nhân | X | X | — | X | — | — | — |
| Hồ sơ Bệnh án (EMR) | X (xem) | X (xem) | X | — | X (xem đơn) | X (xem) | X (xem) |
| Kê Đơn thuốc & Kính | — | — | X | — | X (xem) | X (xem) | — |
| Xét nghiệm & Chẩn đoán | — | — | X | — | — | X (xem) | X |
| Thanh toán & Hóa đơn | X | X | — | X | — | X (xem) | — |
| Báo cáo & Thống kê | X | X | — | — | X (kho) | — | — |
| Quản lý Nhân sự & Lịch làm việc | X | X | X (cá nhân) | — | — | — | X (cá nhân) |
| Cấu hình hệ thống & Phân quyền | X | — | — | — | — | — | — |

---

## 7. Functional Requirements (25 FRs)

### Must Have

| FR | Feature | Mô tả |
|----|---------|--------|
| FR-01 | Auth | Đăng ký/đăng nhập email+password, mã hóa bcrypt |
| FR-03 | Auth | RBAC với 7 roles |
| FR-04 | Auth | Khóa tài khoản sau 5 lần sai liên tiếp trong 30 phút |
| FR-05 | Patient | CRUD hồ sơ bệnh nhân (họ tên, ngày sinh, giới tính, địa chỉ, SĐT, CCCD) |
| FR-06 | Patient | Tìm kiếm theo tên, SĐT, mã bệnh nhân |
| FR-07 | Appointment | Đặt lịch online theo bác sĩ, chọn ngày & khung giờ khả dụng |
| FR-08 | Appointment | Lễ tân xác nhận/sửa/hủy lịch, hệ thống gửi email/SMS tự động |
| FR-10 | EMR | Bác sĩ lập/cập nhật EMR: triệu chứng, chẩn đoán, phác đồ điều trị |
| FR-11 | EMR | Ghi nhận dữ liệu nhãn khoa: VA, BCVA, số đo độ kính hiện tại, nhãn áp, đáy mắt |
| FR-12 | EMR | Kê đơn thuốc & đơn kính (toa kính) điện tử, liên thông kho dược |
| FR-13 | Lab | Bác sĩ chỉ định xét nghiệm; KTV nhập kết quả đo khúc xạ, OCT, chụp ảnh đáy mắt |
| FR-14 | Lab | Kết quả xét nghiệm hiển thị trong EMR, bác sĩ có thể gắn chú thích đọc kết quả |
| FR-15 | Pharmacy | Quản lý danh mục thuốc: số lô, NSX, HSD, đơn vị tính, nhà cung cấp |
| FR-16 | Pharmacy | Cảnh báo tồn kho dưới mức tối thiểu hoặc thuốc sắp hết hạn (≤ 30 ngày) |
| FR-17 | Pharmacy | Xuất thuốc theo đơn kê, trừ tồn kho FIFO theo lô |
| FR-18 | Billing | Tính phí tổng hóa đơn: phí khám + phí xét nghiệm + phí thuốc/kính |
| FR-19 | Billing | Hỗ trợ tiền mặt & chuyển khoản QR Code |
| FR-20 | Billing | Phát sinh & lưu hóa đơn điện tử, in/gửi email cho bệnh nhân |
| FR-21 | Reports | Báo cáo doanh thu ngày/tuần/tháng/năm, xuất Excel |
| FR-24 | Admin | Quản lý tài khoản, phân role, khóa/mở khóa tài khoản |
| FR-25 | Admin | Cấu hình danh mục: loại dịch vụ, bảng giá khám, loại thuốc, phòng khám |

### Should Have

| FR | Feature | Mô tả |
|----|---------|--------|
| FR-02 | Auth | Đăng nhập Google OAuth 2.0 cho Patient |
| FR-09 | Appointment | Auto nhắc lịch qua email trước 24 giờ |
| FR-22 | Reports | Báo cáo số lượt khám, bệnh nhân mới, tỷ lệ bệnh theo loại |
| FR-23 | Reports | Báo cáo xuất-nhập-tồn kho thuốc theo kỳ |

---

## 8. Non-UI Functions (Cron Jobs & Services)

| # | Tên | Loại | Mô tả | Trigger |
|---|-----|------|--------|---------|
| 1 | Auto Reminder Job | Cron | Gửi email nhắc lịch hẹn trước 24 giờ | Mỗi giờ |
| 2 | Low Stock Alert Job | Cron | Kiểm tra tồn kho, gửi cảnh báo khi dưới ngưỡng tối thiểu | Hàng ngày |
| 3 | Expiry Alert Job | Cron | Kiểm tra thuốc hết hạn trong 30 ngày, cảnh báo dược sĩ | Hàng ngày |
| 4 | Invoice PDF Generator | Service | Sinh file PDF hóa đơn điện tử, gửi email cho bệnh nhân | On-demand |
| 5 | Token Refresh Service | API | Refresh JWT Access Token dùng Refresh Token | On-demand |
| 6 | Monthly Report Generator | Cron | Tổng hợp báo cáo tháng trước, lưu DB | Đầu tháng |

---

## 9. Business Rules (9 BRs)

> **Bắt buộc enforce ở cả Frontend validation và Backend service layer.**

| BR ID | Category | Rule |
|-------|----------|------|
| BR-01 | Auth | Mật khẩu ≥ 8 ký tự, bao gồm chữ hoa + chữ thường + số |
| BR-02 | Auth | Khóa tài khoản sau 5 lần đăng nhập sai liên tiếp trong 30 phút |
| BR-03 | Appointment | 1 bác sĩ tối đa 30 lịch hẹn/ngày làm việc |
| BR-04 | Appointment | Lịch hẹn phải đặt trước ≥ 2 giờ so với giờ khám |
| BR-05 | Appointment | Bệnh nhân chỉ được hủy lịch trước ≥ 1 giờ so với giờ khám |
| BR-06 | Prescription | Chỉ bác sĩ có chứng chỉ hành nghề mới được kê đơn thuốc |
| BR-07 | Billing | Hóa đơn chỉ được phát hành khi bệnh nhân đã hoàn tất thanh toán đầy đủ |
| BR-08 | Data | Hồ sơ bệnh án là dữ liệu nhạy cảm — chỉ bác sĩ phụ trách và bệnh nhân mới được xem |
| BR-09 | Data | **Không hard delete** hồ sơ bệnh nhân — chỉ deactivate (soft delete) |

> **So sánh với version cũ:** BR-07 (Pharmacy FIFO) và BR-09 (no expired medicine) đã được gộp vào logic service FR-17, không còn là BR độc lập.

---

## 10. Non-Functional Requirements (KPIs)

| Nhóm | Yêu cầu | KPI |
|------|---------|-----|
| Performance | API response | < 2s tại P95; ≥ 100 RPS |
| Performance | Frontend FCP | < 3s; LCP < 4s; Lighthouse ≥ 80 |
| Security | HTTPS | 100% endpoints HTTPS/TLS 1.2+ |
| Security | JWT | Access Token TTL = 60 phút; Refresh Token TTL = 7 ngày |
| Security | Encryption | AES-256 cho dữ liệu nhạy cảm tại rest |
| Security | OWASP | Pass ZAP scan, không có lỗ hổng High/Critical |
| Availability | Uptime | ≥ 99.5%/tháng (giờ làm việc 7:00–20:00) |
| Availability | Backup | Daily backup; RPO ≤ 24h; RTO ≤ 4h |
| Scalability | Concurrent users | ≥ 300 concurrent users cùng SLA |
| Scalability | DB | Query trên 500K records < 3s với index |
| Usability | Responsive | UI không vỡ từ 375px đến 1920px |
| Usability | UX | User hoàn thành đặt lịch trong < 3 phút |
| Maintainability | Test coverage | ≥ 70% unit test coverage trên service layer |
| Maintainability | API docs | 100% endpoints có Swagger doc với request/response schema |
| Compliance | Dữ liệu cá nhân | Tuân thủ Nghị định 13/2023/NĐ-CP; Log truy cập dữ liệu nhạy cảm |

---

## 11. Assumptions & Constraints

### Assumptions
- AS-1: Phòng khám có kết nối Internet ổn định để sử dụng hệ thống web-based.
- AS-2: Bệnh nhân có email hợp lệ để nhận thông báo & hóa đơn điện tử.
- AS-3: Dữ liệu bệnh nhân cũ sẽ được nhập thủ công hoặc import từ Excel khi triển khai.

### Dependencies
- DE-1: SMTP service (Gmail SMTP / SendGrid) để gửi email.
- DE-2: Google Identity Platform cho OAuth 2.0 (FR-02, Should Have).
- DE-3: Triển khai trên cloud (AWS EC2 / Railway) hoặc VPS.

### Limitations (ngoài phạm vi v1.0)
- Không tích hợp BHYT quốc gia.
- Không hỗ trợ telemedicine / khám từ xa.
- Không tích hợp thiết bị đo thị lực tự động (máy đo khúc xạ điện tử).
- Chỉ hỗ trợ **single-clinic** (chưa hỗ trợ chuỗi phòng khám).

---

## 12. Module Development Priority (Recommended Order)

```
Phase 1 — Foundation
├── Module 9: System Administration (users, roles, RBAC)
└── Module 1: Authentication & Authorization (JWT, login, register)

Phase 2 — Core Clinical Flow
├── Module 2: Patient Management (CRUD hồ sơ, tìm kiếm)
├── Module 3: Appointment Management (đặt lịch, xác nhận, hủy)
└── Module 4: Examination & EMR (tiếp nhận, hồ sơ bệnh án, kê đơn)

Phase 3 — Support Modules
├── Module 5: Laboratory & Diagnostics (xét nghiệm, cắt kính)
├── Module 6: Pharmacy & Inventory (tủ thuốc, xuất thuốc FIFO)
└── Module 7: Billing & Invoice (tính phí, thanh toán, hóa đơn)

Phase 4 — Analytics & Automation
├── Module 8: Reports & Analytics (dashboard, báo cáo)
└── Non-UI: Cron jobs (nhắc lịch, cảnh báo thuốc, báo cáo tháng)
```

---

## 13. Key Integration Points (Cần chú ý khi code)

### Doctor → Prescription → Pharmacy (Luồng kê đơn liên thông)
```
Doctor kê đơn (UC-12)
  → Tạo record trong `prescriptions` + `prescription_items`
  → Pharmacist xuất thuốc
     → Trừ tồn kho trong `medicines` theo FIFO (BR-06 + FR-17)
     → Không xuất nếu thuốc đã hết hạn
```

### Doctor → Lab → EMR (Luồng xét nghiệm & cắt kính)
```
Doctor chỉ định (UC-13)
  → Tạo record trong `lab_orders`
  → Lab Tech nhập kết quả (UC-15)
     → Tạo record trong `lab_results`
  → Doctor đọc kết quả trong EMR (UC-16)

Patient chọn gọng kính (UC-17)
  → Lab Tech cắt kính theo thông số bác sĩ + gọng đã chọn (UC-18)
```

### Appointment → Queue → EMR → Billing (Luồng khám tổng thể)
```
Patient đặt lịch (UC-05b)                 -- hoặc walk-in qua UC-05a
  → Receptionist xác nhận (UC-06)
  → Receptionist tiếp nhận vào khám (UC-10)
  → Doctor lập EMR (UC-11) + Kê đơn (UC-12) + Chỉ định XN (UC-13)
  → Receptionist tính phí (UC-20) + Thu tiền (UC-21) + In HĐ (UC-22)
```

---

## 14. Sensitive Data Handling

Theo BR-08 và Nghị định 13/2023/NĐ-CP:

- `medical_records` — restricted access: chỉ Doctor phụ trách + Patient
- `patients` — AES-256 encryption tại rest
- `users.password` — bcrypt hash, không bao giờ lưu plaintext
- Log truy cập dữ liệu nhạy cảm bắt buộc (audit trail)

---

## 15. Glossary (Thuật ngữ chuyên ngành)

| Thuật ngữ | Viết tắt | Mô tả |
|-----------|----------|--------|
| Electronic Medical Record | EMR | Hồ sơ bệnh án điện tử |
| Visual Acuity (không kính) | VA | Thị lực không có kính |
| Best Corrected Visual Acuity | BCVA | Thị lực có kính tốt nhất |
| Optical Coherence Tomography | OCT | Chụp cắt lớp mạch lạc quang học |
| Role-Based Access Control | RBAC | Phân quyền theo vai trò |
| First In First Out | FIFO | Xuất hàng nhập trước xuất trước (quản lý kho thuốc) |
| Refraction | — | Đo khúc xạ mắt |
| Intraocular Pressure | IOP / Nhãn áp | Áp lực trong nhãn cầu |

---

*File này phản ánh RDS V2.0 (18/05/2025). Cập nhật file khi RDS thay đổi.*