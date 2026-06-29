# Prompt cho AI Code — Admin Use Cases (UC-55, UC-56, UC-57)

> Cách dùng: copy từng block "PROMPT" (kể cả phần Context chung) dán cho AI coding assistant
> (Claude Code, Cursor, Copilot Chat...). Làm theo đúng thứ tự: **UC-57 → UC-55 → UC-56**,
> vì UC-57 tạo ra `AuditLogService` mà 2 UC sau cần gọi.

---

## CONTEXT CHUNG (dán đầu mỗi session làm việc với UC admin)

```
Đây là dự án ECMS (Eyes Clinic Management System).

Backend: Spring Boot 3.4.1, Java 17, Spring Data JPA + Hibernate, SQL Server.
Auth: JWT (jjwt), Spring Security với hasRole/hasAnyRole.
Email: Spring Boot Mail qua interface EmailService / EmailServiceImpl
  (backend/src/main/java/com/ecms/service/EmailService.java và service/impl/EmailServiceImpl.java).
Response wrapper chuẩn: ApiResponse<T> với success/message/data.
Exception: dùng GlobalExceptionHandler + ResourceNotFoundException, UnauthorizedException, FieldValidationException
  (backend/src/main/java/com/ecms/exception/).

Cấu trúc thư mục backend:
backend/src/main/java/com/ecms/
├── controller/   # @RestController
├── service/      # interface
│   └── impl/     # implementation, @Service @RequiredArgsConstructor
├── repository/   # JpaRepository
├── entity/       # JPA entity
├── dto/request/, dto/response/
├── security/, config/, exception/

Frontend: React 19 + Vite, Redux Toolkit, React Router 7, Ant Design 6,
React Hook Form + Zod. API client: frontend/src/api/axiosClient.js.
Page con của Admin (hiện đang là stub return null):
frontend/src/pages/admin/{UserManagementPage,SystemConfigPage,AuditLogPage}.jsx
Route đã có sẵn trong frontend/src/routes/AppRouter.jsx, bảo vệ bởi
<ProtectedRoute allowedRoles={['ADMIN']}>.

Entity User đã có (backend/src/main/java/com/ecms/entity/User.java):
id, email (unique), passwordHash, fullName, phone, role (FK Role), status (enum UserStatus:
PENDING_VERIFICATION/ACTIVE/LOCKED/DISABLED), authProvider (LOCAL/GOOGLE),
failedLoginAttempts, lockUntil, createdAt.
Role entity: id, name (PATIENT/DOCTOR/RECEPTIONIST/LAB_TECHNICIAN/PHARMACIST/MANAGER/ADMIN/NURSE).

Business rule cố định cho toàn hệ thống: BR-09 — KHÔNG hard delete bất kỳ bản ghi nào.
Mọi "xóa" phải là soft delete / set status = INACTIVE hoặc DISABLED.

Không tự ý thêm tính năng ngoài phạm vi use case dưới đây. Không refactor code không liên quan.
Giữ nguyên convention đặt tên và pattern hiện có trong repo (đọc các file tương tự trước khi viết code mới).
```

---

## PROMPT 1 — UC-57: Manage System Audit Log (làm trước tiên)

```
Triển khai UC-57 "Manage System Audit Log" cho ECMS.

MỤC TIÊU: Admin xem được audit log dạng append-only, filter, xem chi tiết before/after,
export CSV. Đây cũng là service nền tảng mà các use case khác (UC-55, UC-56, và sau này
toàn bộ hệ thống) sẽ gọi để ghi log.

Bảng audit_logs đã tồn tại trong DB schema với các cột:
id, user_id (FK -> users), action, entity_type, entity_id, old_value, new_value,
ip_address, created_at (DATETIME2 default GETDATE()).
Entity backend/src/main/java/com/ecms/entity/AuditLog.java hiện đang là class rỗng (stub).
Repository backend/src/main/java/com/ecms/repository/AuditLogRepository.java cũng rỗng.

YÊU CẦU BACKEND:
1. Hoàn thiện entity AuditLog map đúng các cột trên (dùng @ManyToOne tới User cho user_id,
   lazy fetch). old_value/new_value lưu dạng JSON string (NVARCHAR(MAX)/TEXT).
2. Hoàn thiện AuditLogRepository extends JpaRepository<AuditLog, Long>, và thêm hỗ trợ
   filter động (actor/userId, action hoặc entity_type, date range, entity_id) — dùng
   Spring Data JPA Specification hoặc @Query với @Param tùy chọn (nullable params).
3. Tạo AuditLogService (interface) + AuditLogServiceImpl với:
   - method dùng chung cho toàn hệ thống:
     `void log(Long actorUserId, String action, String entityType, String entityId,
               Object oldValue, Object newValue, String ipAddress)`
     — serialize oldValue/newValue sang JSON (dùng ObjectMapper có sẵn nếu repo đã dùng Jackson).
     Method này chạy trong @Transactional riêng (propagation phù hợp để không bị rollback theo
     transaction nghiệp vụ chính nếu nghiệp vụ đó fail) — nhưng đơn giản nhất là cùng transaction,
     không cần phức tạp hoá nếu thấy rủi ro thấp.
   - method phân trang có filter: actor, eventType/action, dateFrom, dateTo, entityId.
   - method export CSV (trả về byte[] hoặc ghi trực tiếp ra HttpServletResponse).
4. Tạo DTO response: AuditLogResponse (id, actorName, actorEmail, action, entityType,
   entityId, oldValue, newValue, ipAddress, createdAt).
5. Trong AdminController (backend/src/main/java/com/ecms/controller/AdminController.java,
   hiện rỗng), thêm:
   - GET /api/v1/admin/audit-logs  (query params: actorId, action, entityType, entityId,
     dateFrom, dateTo, page, size) — secured hasRole("ADMIN")
   - GET /api/v1/admin/audit-logs/{id}  (chi tiết 1 entry)
   - GET /api/v1/admin/audit-logs/export (cùng filter, trả CSV, header
     Content-Disposition: attachment; filename=audit_log.csv)
6. QUAN TRỌNG — bảo vệ append-only ở mức DB: thêm note/migration script (file .sql riêng,
   không cần chạy tự động) REVOKE UPDATE, DELETE ON audit_logs FROM <app_db_user>; chỉ cho
   phép INSERT, SELECT. Không implement bất kỳ endpoint update/delete cho audit log.
7. KHÔNG cần tích hợp việc gọi log() vào các luồng nghiệp vụ khác trong prompt này — đó là
   việc của các prompt UC-55/UC-56 sau, để giữ phạm vi commit này gọn.

YÊU CẦU FRONTEND:
1. Tạo service frontend/src/services/auditLogService.js theo pattern các service hiện có
   trong frontend/src/services/ (xem authService.js để theo đúng convention gọi axiosClient).
2. Hoàn thiện frontend/src/pages/admin/AuditLogPage.jsx (đang return null):
   - Bảng Ant Design (Table) hiển thị log mới nhất trước, cột: thời gian, actor, action,
     entity_type, entity_id, ip_address.
   - Bộ filter trên đầu bảng: chọn actor (search), event type (select), date range picker,
     entity ID (input).
   - Click một row mở Modal/Drawer hiển thị chi tiết, có diff before/after (hiển thị JSON
     old_value/new_value, có thể dùng <pre> hoặc thư viện diff nếu đã có sẵn trong deps).
   - Nút "Export CSV" gọi endpoint export, trigger download file qua blob.
   - Phân trang dùng Table pagination chuẩn của antd, gọi lại API mỗi khi đổi page/filter.

ACCEPTANCE CRITERIA:
- Không có endpoint hoặc method nào cho phép update/delete bản ghi audit log.
- Filter kết hợp được nhiều điều kiện cùng lúc (actor + date range, v.v.).
- Export CSV chỉ xuất đúng dữ liệu đã filter trên màn hình (không xuất toàn bộ log).
- Trang chỉ render khi user có role ADMIN (đã được ProtectedRoute chặn ở route level, không
  cần check lại role trong page, nhưng backend PHẢI check hasRole("ADMIN") ở controller).
```

---

## PROMPT 2 — UC-55: Manage User Account

```
Triển khai UC-55 "Manage User Account" cho ECMS. Yêu cầu PROMPT 1 (UC-57 AuditLogService)
đã được implement trước — sẽ gọi auditLogService.log(...) tại mỗi điểm thay đổi tài khoản.

PHẠM VI: Admin chỉ quản lý tài khoản NHÂN VIÊN (DOCTOR/RECEPTIONIST/LAB_TECHNICIAN/
PHARMACIST/MANAGER/NURSE/ADMIN). Tài khoản PATIENT KHÔNG được tạo/sửa qua UC này — patient
tự đăng ký (UC-01) hoặc được receptionist walk-in đăng ký (UC-13). Nếu admin chọn role
PATIENT khi tạo account, chặn lại bằng lỗi validation rõ ràng.

Entity User (backend/src/main/java/com/ecms/entity/User.java) đã có status enum
PENDING_VERIFICATION/ACTIVE/LOCKED/DISABLED. UC dùng INACTIVE/ACTIVE — map INACTIVE vào
PENDING_VERIFICATION (tài khoản mới, chưa activate) hoặc dùng đúng tên hiện có trong enum,
KHÔNG đổi tên enum value đã tồn tại nếu đang được dùng nơi khác trong code — kiểm tra trước
bằng cách grep UserStatus trong toàn repo trước khi quyết định.

YÊU CẦU BACKEND:
1. AdminController + AdminService/AdminServiceImpl (controller hiện rỗng, service chưa có
   — tạo theo đúng pattern interface + impl của các service khác trong repo):
   - POST   /api/v1/admin/users            tạo tài khoản nhân viên mới
   - GET    /api/v1/admin/users            danh sách, filter theo role/status/tên/email,
            phân trang
   - GET    /api/v1/admin/users/{id}       chi tiết 1 tài khoản
   - PUT    /api/v1/admin/users/{id}       sửa fullName/role/department (department field:
            kiểm tra nếu User entity chưa có field department — nếu UC yêu cầu mà entity
            chưa có, thêm field + migration, nhưng XÁC NHẬN field này thật sự cần trước khi
            thêm cột mới, ưu tiên dùng field có sẵn nếu tương đương)
   - PATCH  /api/v1/admin/users/{id}/activate     set status = ACTIVE, gửi email chào mừng
   - PATCH  /api/v1/admin/users/{id}/deactivate   set status = DISABLED, vô hiệu hoá token
   Tất cả secured hasRole("ADMIN").
2. Khi tạo tài khoản (POST /users):
   - Validate email chưa tồn tại (existsByEmail có sẵn trong UserRepository) — nếu trùng,
     trả lỗi rõ "This email is already registered." (E1), HTTP 409.
   - Sinh password tạm ngẫu nhiên đủ mạnh (ví dụ dùng SecureRandom, 12 ký tự gồm chữ hoa/
     thường/số/ký tự đặc biệt), hash bằng cùng cơ chế password hashing hiện có (xem
     AuthServiceImpl cách hash password khi register, dùng lại đúng PasswordEncoder bean).
   - Set status ban đầu = trạng thái "chưa active" tương ứng (xem điểm phía trên).
   - KHÔNG gửi email ngay lúc tạo — chỉ gửi khi admin gọi /activate (theo Normal Flow UC).
3. Khi activate:
   - Set status = ACTIVE.
   - Gửi email chào mừng kèm temp password — thêm method mới vào EmailService/
     EmailServiceImpl: `sendNewStaffAccountEmail(String toEmail, String fullName,
     String tempPassword)`, theo đúng style HTML/CSS các email khác đã có trong
     EmailServiceImpl (font Segoe UI, theme xanh #1d4ed8), dùng helper `send(...)` có sẵn.
   - Gọi auditLogService.log(adminId, "ACTIVATE_ACCOUNT", "USER", userId, oldStatus, "ACTIVE", ip).
4. Khi deactivate:
   - Set status = DISABLED.
   - Vô hiệu hoá token đang active: kiểm tra cơ chế JWT hiện tại (JwtUtil) có hỗ trợ
     blacklist/refresh-token-revocation chưa — nếu JWT là stateless thuần không có
     server-side session, cách thực tế nhất là thêm field `tokenVersion` (int) vào User,
     tăng tokenVersion mỗi lần deactivate, và JwtAuthFilter phải so sánh tokenVersion trong
     token với tokenVersion hiện tại trong DB để reject token cũ. Nếu cơ chế blacklist/
     tokenVersion đã tồn tại sẵn ở đâu đó trong repo (kiểm tra trước khi thêm), tái sử dụng.
   - Gọi auditLogService.log(...).
5. Khi edit (PUT):
   - Cập nhật field, ghi log với old_value/new_value là JSON của field thay đổi.
6. Mọi action trong AdminController phải lấy IP address từ HttpServletRequest
   (request.getRemoteAddr(), hoặc header X-Forwarded-For nếu repo có config proxy) để truyền
   vào auditLogService.log.
7. KHÔNG bao giờ xóa cứng bản ghi User (BR-09) — không tạo endpoint DELETE /users/{id}.

YÊU CẦU FRONTEND:
1. frontend/src/services/adminUserService.js theo convention service hiện có.
2. Hoàn thiện frontend/src/pages/admin/UserManagementPage.jsx:
   - Table danh sách user: tên, email, role, department, status (tag màu theo trạng thái),
     ngày tạo.
   - Filter theo role/status, search theo tên/email.
   - Button "Add New User" mở Modal form (React Hook Form + Zod): fullName, email, role
     (select từ danh sách role NHÂN VIÊN, không hiện PATIENT), department.
   - Sau khi tạo, hiển thị rõ trạng thái INACTIVE và nút "Activate Account" trên row đó
     (đúng theo Normal Flow: tạo trước, activate sau — không activate tự động khi tạo).
   - Nút Activate / Deactivate trên mỗi row (deactivate có Popconfirm xác nhận trước khi gọi
     API vì đây là hành động ảnh hưởng tới quyền truy cập của người khác).
   - Modal/Drawer edit account: fullName, role, department.
   - Hiển thị thông báo lỗi rõ ràng khi email đã tồn tại (E1).

ACCEPTANCE CRITERIA:
- Không có cách nào tạo tài khoản role PATIENT qua màn hình admin.
- Không có nút hoặc API xóa cứng tài khoản.
- Mỗi create/edit/activate/deactivate đều sinh một dòng audit log tương ứng.
- Sau deactivate, token JWT cũ của user đó không còn dùng được cho request tiếp theo (test
  bằng cách deactivate rồi gọi 1 API bất kỳ với token cũ, phải nhận 401/403).
```

---

## PROMPT 3 — UC-56: Configure System and Data

> ⚠️ Trước khi dùng prompt này, cần chốt phạm vi: theo Description/Assumption của UC-56,
> Admin KHÔNG quản lý Service/Medicine catalogue (đó thuộc Clinic Manager), nhưng Normal Flow
> trong tài liệu lại liệt kê "Services & Pricing / Medicines" như 2 trong 4 category Admin
> sửa được — hai phần mâu thuẫn nhau. Prompt dưới đây viết theo phương án AN TOÀN hơn
> (Admin chỉ quản lý Clinic Info + Notification Templates + RBAC/permission settings,
> KHÔNG đụng Service/Medicine pricing) để khớp với Description đã ghi rõ trong UC.
> Nếu bạn xác nhận muốn Admin quản lý luôn Services/Medicines, sửa lại mục "PHẠM VI" trước khi
> đưa cho AI code.

```
Triển khai UC-56 "Configure System and Data" cho ECMS. Yêu cầu PROMPT 1 (UC-57) đã có
auditLogService.log(...) để gọi tại mỗi lần thay đổi config.

PHẠM VI (đã chốt): Admin chỉ cấu hình:
1. Clinic Info (thông tin chung của clinic — tên, địa chỉ, số điện thoại, giờ làm việc...).
2. Notification Templates (mẫu nội dung email/SMS/in-app gửi cho user).
3. RBAC / permission settings ở mức role (không phải thêm role mới tuỳ tiện, mà cấu hình
   bộ quyền mặc định cho từng role nếu hệ thống có model permission động; nếu hệ thống hiện
   tại dùng RBAC tĩnh qua hasRole() trong code (đã xác nhận đúng là vậy trong SecurityConfig),
   thì phần "configure RBAC" ở UC này CHỈ LÀ màn hình xem (read-only) danh sách role và
   quyền tương ứng đã hard-code, KHÔNG implement chỉnh sửa quyền động trong phạm vi này —
   việc đó là một thay đổi kiến trúc lớn hơn, ngoài phạm vi UC-56, không tự ý làm.
Service catalogue & pricing, Medicine catalogue: KHÔNG thuộc phạm vi UC này — không tạo,
không sửa endpoint nào liên quan, không động vào ClinicServiceController/ManagerController
hiện có.

Bảng system_configs đã tồn tại trong DB: id, config_key (unique), config_value
(NVARCHAR(MAX)), data_type (STRING/INTEGER/BIT/JSON), description, updated_by (FK users),
updated_at. Chưa có entity/repository — cần tạo mới.
Notification entity (backend/src/main/java/com/ecms/entity/Notification.java) hiện là stub,
và bảng notifications hiện tại là bảng LƯU BẢN GHI ĐÃ GỬI (user_id, channel, subject, body,
sent_status...), KHÔNG phải bảng template. Cần tạo bảng/entity MỚI riêng cho template,
ví dụ `notification_templates` (id, template_key unique [VD: WELCOME_EMAIL,
APPOINTMENT_REMINDER...], channel, subject, body, variables_hint, is_active, updated_by,
updated_at) — viết migration SQL mới, không tái sử dụng/đổi cấu trúc bảng `notifications`
hiện có vì nó đang được dùng cho mục đích khác.

YÊU CẦU BACKEND:
1. Tạo entity SystemConfig (map đúng bảng system_configs) + SystemConfigRepository
   (findByConfigKey, existsByConfigKey).
2. Tạo entity NotificationTemplate (bảng mới notification_templates, kèm file migration .sql
   trong thư mục chứa các file *.sql hiện có của repo, theo đúng convention đặt tên) +
   NotificationTemplateRepository.
3. Tạo SystemConfigService/Impl:
   - getClinicInfo() / updateClinicInfo(...) — đọc/ghi các config_key thuộc nhóm clinic info
     (clinic_name, clinic_phone, clinic_address, clinic_hours...). Validate input theo
     data_type khai báo (parse đúng kiểu, reject nếu sai format).
   - Validate trước khi lưu: required field, không trùng tên (đối với key), giá trị hợp lệ
     theo data_type.
4. Tạo NotificationTemplateService/Impl: CRUD template, nhưng "xóa" = set is_active = false
   (BR-09, không hard delete). Nếu template đang được hệ thống tham chiếu trực tiếp bằng
   template_key cố định trong code (kiểm tra), chặn việc đổi/xoá template_key, chỉ cho sửa
   subject/body.
5. AdminController thêm:
   - GET  /api/v1/admin/config/clinic-info
   - PUT  /api/v1/admin/config/clinic-info
   - GET  /api/v1/admin/config/notification-templates
   - POST /api/v1/admin/config/notification-templates
   - PUT  /api/v1/admin/config/notification-templates/{id}
   - PATCH /api/v1/admin/config/notification-templates/{id}/deactivate   (soft "delete", trả
     lỗi rõ nếu template đang được dùng — "This item is in use. Deactivate instead of
     deleting." nếu cố hard-delete bằng nhầm endpoint nào khác)
   - GET  /api/v1/admin/config/roles-permissions   (read-only, trả danh sách role + danh sách
     quyền hard-coded tương ứng, lấy từ một bảng tra cứu tĩnh trong code, không từ DB động)
   Tất cả secured hasRole("ADMIN").
6. Mỗi update gọi auditLogService.log(adminId, "UPDATE_CONFIG"/"UPDATE_TEMPLATE", entityType,
   entityId, oldValue, newValue, ip).

YÊU CẦU FRONTEND:
1. frontend/src/services/systemConfigService.js theo convention hiện có.
2. Hoàn thiện frontend/src/pages/admin/SystemConfigPage.jsx với layout Tabs (Ant Design Tabs):
   - Tab "Clinic Info": form chỉnh sửa thông tin clinic, nút Save.
   - Tab "Notification Templates": table danh sách template (key, channel, subject, trạng
     thái active), modal tạo/sửa nội dung template (body có thể dùng Textarea/RichText nếu
     repo đã có rich text editor dependency, nếu không thì Textarea thường), nút deactivate
     có Popconfirm.
   - Tab "Roles & Permissions" (read-only): bảng hiển thị role và quyền tương ứng, không có
     nút sửa (ghi rõ chú thích nhỏ trong UI "Permissions are managed in code for this
     release" nếu cần làm rõ với end-user).

ACCEPTANCE CRITERIA:
- Không có endpoint/UI nào trong UC-56 đụng tới Service catalogue hoặc Medicine catalogue.
- Không có hard-delete nào với config hoặc template — chỉ deactivate.
- Cố gắng xóa cứng một config/template đang được tham chiếu phải trả lỗi rõ ràng theo E1.
- Mọi thay đổi config đều xuất hiện trong audit log (verify qua UC-57 sau khi update).
```

---

## Gợi ý dùng

- Dán **CONTEXT CHUNG** một lần đầu mỗi phiên làm việc mới với AI.
- Dán từng **PROMPT 1/2/3** theo thứ tự, mỗi prompt nên là một task/commit riêng để dễ review.
- Sau khi AI sinh code, luôn yêu cầu nó tự chạy build/test backend (`mvn test`) và build
  frontend trước khi báo hoàn thành, vì 3 UC này đụng vào auth/token revocation và audit log
  — sai sót ở đây ảnh hưởng bảo mật toàn hệ thống.
