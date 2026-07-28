# UC-54 — Approve Payroll

> Mã trong SRS: **UC-53** · Xem [README](README.md#️-lưu-ý-về-đánh-số-uc)
> Actor: **Clinic Manager** (duy nhất — xem §7)
> Màn hình: `/manager/payroll`
> Diagram có sẵn: [UC54_ApprovePayroll_ClassDiagram.puml](../diagrams/UC54_ApprovePayroll_ClassDiagram.puml) · [SequenceDiagram](../diagrams/UC54_ApprovePayroll_SequenceDiagram.puml)
> Business rules: **BR-09** (No Hard Delete), **BR-17** (Payroll Authority)

## 1. Mục tiêu

Soạn bảng lương tháng từ dữ liệu hoạt động có sẵn trong hệ thống, cho phép quản lý điều chỉnh
từng dòng kèm lý do, rồi **duyệt một chiều** — duyệt xong là khóa vĩnh viễn và ghi Audit Log.

ECMS **không chi tiền**; use case này chỉ chốt con số và tạo dấu vết trách nhiệm.

## 2. Điều kiện

**Tiên quyết**
- Đăng nhập vai trò `MANAGER` (duyệt) hoặc `MANAGER`/`ADMIN` (xem, soạn nháp).
- Kỳ lương chưa ở trạng thái `APPROVED`.

**Hậu điều kiện**
- POST-1: `payroll_period.status = APPROVED`, ghi `approvedBy` + `approvedAt`.
- POST-2: **mọi** dòng lương `locked = true`, không sửa/xóa được nữa (BR-09).
- POST-4: một bản ghi `APPROVE_PAYROLL` trong Audit Log.

## 3. Vòng đời

```
(chưa có) ──generate──► DRAFT ──updateItem──► DRAFT ──approve──► APPROVED  [khóa vĩnh viễn]
                          ▲                                          │
                          └────── generate lại (xóa sạch, dựng lại) ─┘ ✗ bị chặn
```

## 4. Luồng chính

### Bước 1-2 — Soạn nháp

`POST /api/v1/payroll/generate?year=&month=` → `PayrollServiceImpl.generateDraft()`

**Xóa sạch dòng cũ rồi dựng lại từ đầu**, nên chạy lại luôn phản ánh dữ liệu hoạt động mới nhất.

```java
if (month < 1 || month > 12) throw IllegalArgumentException
if (period != null && "APPROVED".equals(period.getStatus())) throw IllegalStateException
// ← BR-09: kỳ đã duyệt là đóng băng, từ chối dựng lại
```

Chỉ kỳ `DRAFT` mới tới được nhánh `itemRepository.deleteAll(...)`.

Quét **ba bảng riêng biệt** vì nhân sự không nằm chung một chỗ:

| Nhóm | Bảng | Nguồn hoạt động | Thưởng |
|---|---|---|---|
| Bác sĩ | `doctors` | `countByDateAndStatusAndDoctorId(COMPLETED)` | `doctorRatePerVisit × số ca khám` |
| Staff / điều dưỡng | `staffs` | `countCompletedByNurseBetween()` | `nurseRatePerSession × số buổi chăm sóc` |
| KTV xét nghiệm | `lab_technicians` | `countCompletedByTechnicianBetween()` | `labRatePerTest × số xét nghiệm` |

- **KTV phải quét riêng** vì không nằm trong `staffs` — thiếu vòng lặp đó là họ bị rơi khỏi
  bảng lương hoàn toàn.
- `CareSession.nurse` trỏ tới **tài khoản user**, không phải dòng `staffs`, nên phải truyền
  `s.getUser().getId()`.
- Lễ tân / dược sĩ / quản lý **không có dấu vết đếm được** → chỉ seed lương cơ bản theo vai
  trò, chờ điều chỉnh tay.
- `isActive()` bỏ qua nhân sự đã nghỉ; `status == null` vẫn tính là active để không đánh rơi
  dữ liệu cũ.

Mỗi dòng lưu **cả hai** giá trị:

```java
.netPay(base.add(bonus))          // giá trị hiện tại, sẽ thay đổi khi sửa tay
.systemNetPay(base.add(bonus))    // mốc hệ thống tính, ĐÓNG BĂNG tại thời điểm soạn nháp
```

### Bước 3 — Điều chỉnh từng dòng

`PATCH /api/v1/payroll/items/{id}` → `updateItem()`

```java
if (Boolean.TRUE.equals(item.getLocked())
        || "APPROVED".equals(item.getPeriod().getStatus())) throw ...
```

Kiểm tra **cả cờ dòng lẫn trạng thái kỳ** — để không sửa được qua một reference cũ dù cờ
riêng của dòng bị sót.

```java
item.setNetPay(nz(baseSalary).add(nz(performanceBonus)).subtract(nz(deduction)));
```

`netPay` **luôn tính lại từ 3 thành phần, không bao giờ nhận từ client** — dòng đã sửa không
thể mâu thuẫn với chính các cấu phần của nó.

#### E-1 — bắt buộc ghi lý do khi lệch ngưỡng

`requireJustificationIfBeyondThreshold()`:

```java
variancePercent = |netPay − systemNetPay| / |systemNetPay| × 100
if (variancePercent > varianceThresholdPercent && note trống) throw ...
```

Ba chi tiết đáng chú ý:

1. **Mốc so sánh là `systemNetPay`, không phải giá trị lần sửa trước.** Nếu so với lần trước
   thì sửa 10 lần mỗi lần 5% sẽ lách được thành 50%.
2. `baseline == 0` không chia được → quy tắc riêng: hệ thống tính ra 0 mà giờ trả tiền thì
   **luôn** phải giải thích.
3. `baseline == null` (dòng cũ) → bỏ qua, thay vì chặn oan mọi chỉnh sửa.

Chặn ở **service** chứ không chỉ ở UI: duyệt xong là khóa vĩnh viễn (BR-09), không còn cơ hội
hỏi "vì sao sửa".

### Bước 4-7 — Duyệt

`POST /api/v1/payroll/periods/{id}/approve` → `approve()`, **một `@Transactional`**:

1. **Chống duyệt hai lần** — nếu không sẽ ghi đè `approvedBy` / `approvedAt`.
2. **E-2 — kiểm tra TRƯỚC khi khóa:**
   - kỳ không có dòng nào → chặn
   - còn dòng nào `baseSalary <= 0` → chặn, **kèm danh sách tên**

   > Duyệt là một chiều (BR-09) — duyệt nhầm là khóa vĩnh viễn dòng lương 0đ.
3. `status = APPROVED`, ghi `approvedBy` (lấy từ JWT) + `approvedAt`.
4. `locked = true` cho **mọi** dòng, **cùng transaction** với việc đổi status — để không dòng
   nào còn sửa được sau khi duyệt.
5. `auditLogService.log(actorUserId, "APPROVE_PAYROLL", "PayrollPeriod", id, ...)` kèm tổng
   thực nhận. Bọc `try/catch` — lỗi audit không hủy việc duyệt.

## 5. Tham số cấu hình

| Property | Dùng cho |
|---|---|
| `doctorRatePerVisit` | Thưởng mỗi ca khám hoàn thành |
| `nurseRatePerSession` | Thưởng mỗi buổi chăm sóc |
| `labRatePerTest` | Thưởng mỗi xét nghiệm |
| `baseSalaryDoctor` / `baseSalaryStaff` / `baseSalaryLabTechnician` | Lương cơ bản mặc định |
| `varianceThresholdPercent` | Ngưỡng % buộc ghi lý do (E-1) |

## 6. Cấu trúc một dòng lương

| Cột | Ý nghĩa |
|---|---|
| `staffType` | `DOCTOR` / `STAFF` / `LAB_TECHNICIAN` |
| `staffRefId` | Khóa chính trong bảng tương ứng |
| `activityCount` | Số ca khám / buổi chăm sóc / xét nghiệm |
| `baseSalary` | Lương cơ bản |
| `performanceBonus` | `rate × activityCount` |
| `deduction` | Khấu trừ (mặc định 0) |
| `netPay` | `base + bonus − deduction`, **luôn derived** |
| `systemNetPay` | Mốc hệ thống tính, đóng băng lúc soạn nháp |
| `note` | Lý do điều chỉnh (bắt buộc khi vượt ngưỡng) |
| `locked` | `true` sau khi duyệt |

## 7. Phân quyền — BR-17

Trong [SecurityConfig.java](../../backend/src/main/java/com/ecms/config/SecurityConfig.java):

```java
.requestMatchers(POST, "/api/v1/payroll/periods/*/approve").hasRole("MANAGER")   // CHỈ MANAGER
.requestMatchers("/api/v1/payroll/**").hasAnyRole("MANAGER", "ADMIN")            // xem/soạn: ADMIN cũng được
```

⚠️ **Dòng `approve` bắt buộc phải đứng TRƯỚC dòng wildcard.** Spring Security lấy matcher
khớp **đầu tiên** — đảo thứ tự là ADMIN duyệt được lương, phá vỡ BR-17.

Người duyệt lấy từ **JWT principal**, không từ request body → không thể mạo danh
(`PayrollController.approve()` resolve `userDetails.getUsername()` → `User`).

> Project **chưa bật `@EnableMethodSecurity`**, nên `@PreAuthorize` trên controller sẽ **không
> có tác dụng**. Mọi quyền phải khai báo tường minh trong `SecurityConfig`.

## 8. Bản đồ code

| Thành phần | File | Method chính |
|---|---|---|
| UI | [PayrollPage.jsx](../../frontend/src/pages/manager/PayrollPage.jsx) | — |
| API client | [payrollService.js](../../frontend/src/services/payrollService.js) | `generate()`, `listPeriods()`, `getPeriod()`, `updateItem()`, `approve()` |
| Controller | [PayrollController.java](../../backend/src/main/java/com/ecms/controller/PayrollController.java) | `generate()`, `periods()`, `period()`, `updateItem()`, `approve()` |
| Service | [PayrollServiceImpl.java](../../backend/src/main/java/com/ecms/service/impl/PayrollServiceImpl.java) | `generateDraft()`, `updateItem()`, `approve()`, `requireJustificationIfBeyondThreshold()`, `isActive()`, `isNurse()` |
| Entity | [PayrollPeriod.java](../../backend/src/main/java/com/ecms/entity/PayrollPeriod.java), [PayrollItem.java](../../backend/src/main/java/com/ecms/entity/PayrollItem.java) | — |
| Repository | [PayrollPeriodRepository](../../backend/src/main/java/com/ecms/repository/PayrollPeriodRepository.java), [PayrollItemRepository](../../backend/src/main/java/com/ecms/repository/PayrollItemRepository.java) | — |
| Audit | `AuditLogService` | `log(..., "APPROVE_PAYROLL", ...)` |

## 9. API

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/v1/payroll/generate?year=&month=` | MANAGER, ADMIN | Soạn / soạn lại nháp |
| GET | `/api/v1/payroll/periods` | MANAGER, ADMIN | Danh sách kỳ, mới nhất trước |
| GET | `/api/v1/payroll/periods/{id}` | MANAGER, ADMIN | Kỳ + toàn bộ dòng lương |
| PATCH | `/api/v1/payroll/items/{id}` | MANAGER, ADMIN | Điều chỉnh một dòng |
| POST | `/api/v1/payroll/periods/{id}/approve` | **MANAGER** | Duyệt + khóa |

`year` / `month` mặc định là tháng hiện tại nếu không truyền.

## 10. Luồng ngoại lệ

| Mã | Tình huống | Xử lý |
|---|---|---|
| — | `month` ngoài 1-12 | `IllegalArgumentException` |
| — | Soạn lại kỳ đã duyệt | `IllegalStateException` (BR-09) |
| E-1 | Điều chỉnh lệch quá ngưỡng, không ghi lý do | `IllegalStateException` kèm % lệch và tên nhân sự |
| E-1' | `systemNetPay = 0` mà `netPay ≠ 0`, không ghi lý do | `IllegalStateException` |
| E-2 | Duyệt kỳ trống | `IllegalStateException` |
| E-2' | Duyệt khi còn dòng `baseSalary <= 0` | `IllegalStateException` kèm danh sách tên |
| — | Duyệt lần hai | `IllegalStateException` |
| — | Sửa dòng của kỳ đã duyệt | `IllegalStateException` |
| — | ADMIN gọi endpoint approve | HTTP 403 (BR-17) |

## 11. Hạn chế đã biết

- **Không có đường quay lui.** `APPROVED` là trạng thái cuối; sai sót chỉ xử lý được bằng
  cách tạo kỳ điều chỉnh riêng (chưa có tính năng này).
- Lễ tân / dược sĩ / quản lý luôn cần điều chỉnh tay vì hệ thống không đếm được hoạt động
  của họ — dễ bị bỏ sót và chặn lúc duyệt bởi E-2.
- Hệ số lương nằm ở `application.properties`, đổi hệ số **không** hồi tố các kỳ đã soạn nháp;
  phải `generate` lại.
- Không có phê duyệt nhiều cấp, không có chữ ký số — chỉ có Audit Log.
- ECMS không kết nối ngân hàng để chi lương; việc chi diễn ra ngoài hệ thống.
