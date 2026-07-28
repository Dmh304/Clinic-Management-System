# UC-51 — View Patient Volume Statistics and Trends

> Mã trong SRS: **UC-50** · Xem [README](README.md#️-lưu-ý-về-đánh-số-uc)
> Actor: **Clinic Manager**
> Màn hình: `/manager/patient-statistics`

## 1. Mục tiêu

Thống kê lưu lượng bệnh nhân trong một kỳ: tổng lượt hẹn, số bệnh nhân khác nhau, **mới vs
quay lại**, phân bố theo trạng thái lịch hẹn, theo bác sĩ, và **top 5 dịch vụ** được đặt nhiều nhất.

## 2. Điều kiện

**Tiên quyết** — vai trò `MANAGER` / `ADMIN`.
**Hậu điều kiện** — không có; read-only.

## 3. Luồng dữ liệu

```
PatientStatisticsPage.jsx
  → reportService.patientStatistics(from, to)
  → GET /api/v1/reports/patient-statistics?from=&to=
  → ReportController.patientStatistics()  →  defaultRange()
  → ReportServiceImpl.patientStatistics()      @Transactional(readOnly = true)
```

Mặc định kỳ: **đầu tháng hiện tại → hôm nay**. `from > to` bị chặn bằng lỗi (xem
[UC-50 §3](UC50_RevenueReport.md#defaultrange--xử-lý-khoảng-ngày)).

## 4. Công thức tính

Nguồn duy nhất: `appointmentRepository.findByAppointmentTimeBetween(start, end)` — nạp cả
entity rồi gom trong Java.

### 4.1 Ba map gom trong một vòng lặp

```java
for (Appointment a : appts) {
    byStatus.merge(a.getStatus().name(), 1L, Long::sum);            // theo trạng thái
    perDoctor.merge(a.getDoctor().getFullName(), 1L, Long::sum);    // theo bác sĩ
    distinctPatients.putIfAbsent(a.getPatient().getId(), a.getPatient());
}
```

Mỗi lần gom đều có guard null riêng — lịch chưa gán bác sĩ vẫn được đếm vào `byStatus`.

`distinctPatients` là `LinkedHashMap<Long, Patient>` nên `putIfAbsent` khử trùng theo id:
một bệnh nhân khám 3 lần trong kỳ chỉ tính là **1 người**.

### 4.2 Mới vs quay lại

```java
boolean isNew = p.getCreatedAt() != null && !p.getCreatedAt().isBefore(start);
```

**"Mới" = hồ sơ bệnh nhân được tạo trong kỳ**, tức không tồn tại trước ngày bắt đầu.

> Cùng một bệnh nhân có thể là "mới" ở kỳ này và "quay lại" ở kỳ sau — đó là hành vi đúng
> theo định nghĩa, không phải lỗi.

Bệnh nhân có `createdAt == null` (dữ liệu cũ) được xếp vào **quay lại**.

### 4.3 Top 5 dịch vụ

```java
for (Appointment a : appts) {
    if (a.getStatus() == AppointmentStatus.CANCELLED) continue;   // bỏ lịch đã hủy
    ClinicService svc = a.getClinicService();
    if (svc == null) continue;
    serviceCount.computeIfAbsent(svc.getId(), k -> new long[1])[0]++;
}
// sắp giảm dần theo count, limit(5)
```

**Vì sao là dịch vụ chứ không phải chẩn đoán** (ghi rõ trong comment code):

> `medical_records.diagnosis` là text bác sĩ gõ tay, không có mã ICD, nên "Viêm kết mạc cấp"
> và "Viêm kết mạc cấp do vi khuẩn" bị đếm thành hai bệnh khác nhau — bảng xếp hạng gần như
> luôn ra toàn "1 ca" và không dùng được. Dịch vụ thì có danh mục và id nên gom nhóm chính xác.

Bỏ lịch `CANCELLED` vì đặt rồi hủy không phản ánh dịch vụ nào đang được dùng nhiều.

## 5. Cấu trúc kết quả

| Key | Kiểu | Mô tả |
|---|---|---|
| `from`, `to` | date | Kỳ báo cáo |
| `totalAppointments` | long | Tổng lượt hẹn (**mọi trạng thái**, kể cả `CANCELLED`) |
| `distinctPatients` | long | Số bệnh nhân khác nhau |
| `newPatients` | long | Hồ sơ tạo trong kỳ |
| `returningPatients` | long | `distinctPatients − newPatients` |
| `appointmentsByStatus` | map | `PENDING`/`CONFIRMED`/`WAITING`/`IN_PROGRESS`/`COMPLETED`/`CANCELLED` → số lượng |
| `appointmentsByDoctor` | map | Tên bác sĩ → số lượt |
| `topServices` | list | `{serviceId, serviceName, count}` — tối đa 5 |

## 6. Xuất Excel

`GET /api/v1/reports/patient-statistics/export` → `exportPatientStatisticsXlsx()`

Chạy lại `patientStatistics()` với cùng kỳ để file khớp màn hình, stream qua `writeXlsx()`.

## 7. Bản đồ code

| Thành phần | File |
|---|---|
| UI | [PatientStatisticsPage.jsx](../../frontend/src/pages/manager/PatientStatisticsPage.jsx) |
| API client | [reportService.js](../../frontend/src/services/reportService.js) — `patientStatistics()`, `exportPatientStatistics()` |
| Controller | [ReportController.java](../../backend/src/main/java/com/ecms/controller/ReportController.java) — `patientStatistics()`, `exportPatientStatistics()` |
| Service | [ReportServiceImpl.java](../../backend/src/main/java/com/ecms/service/impl/ReportServiceImpl.java) — `patientStatistics()` |
| Repository | [AppointmentRepository.java](../../backend/src/main/java/com/ecms/repository/AppointmentRepository.java) — `findByAppointmentTimeBetween()` |

## 8. API

| Method | Path | Tham số | Quyền |
|---|---|---|---|
| GET | `/api/v1/reports/patient-statistics` | `from`, `to` (optional) | MANAGER, ADMIN |
| GET | `/api/v1/reports/patient-statistics/export` | như trên | MANAGER, ADMIN |

## 9. Hạn chế đã biết

- `totalAppointments` **bao gồm cả lịch `CANCELLED`**, trong khi `topServices` thì loại
  chúng ra. Hai con số trên cùng màn hình có mẫu số khác nhau — cần chú thích trên UI.
- "Mới" dựa vào `patient.createdAt`, tức **ngày tạo hồ sơ**, không phải ngày khám đầu tiên.
  Bệnh nhân được lễ tân tạo hồ sơ trước rồi vài tháng sau mới khám sẽ bị tính là "quay lại".
- Nạp toàn bộ entity `Appointment` của kỳ vào bộ nhớ thay vì `GROUP BY` — kỳ dài (cả năm)
  sẽ nặng.
- `appointmentsByDoctor` gộp theo **tên**, không theo id — hai bác sĩ trùng tên sẽ bị cộng dồn.
- `topServices` chỉ đếm dịch vụ gắn trực tiếp trên lịch hẹn (`appointment.clinicService`),
  không tính dịch vụ phát sinh trong lượt khám.
