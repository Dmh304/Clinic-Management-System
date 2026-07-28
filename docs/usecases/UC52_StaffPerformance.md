# UC-52 — Monitor Staff Performance Dashboard

> Mã trong SRS: **UC-51** · Xem [README](README.md#️-lưu-ý-về-đánh-số-uc)
> Actor: **Clinic Manager**
> Màn hình: `/manager/staff`

## 1. Mục tiêu

Bốn KPI cho **từng bác sĩ** trong một kỳ: số bệnh nhân đã khám, tỉ lệ đúng giờ, số đơn thuốc
đã kê, và thời gian khám trung bình.

Hai KPI cuối là **giá trị xấp xỉ** — schema không có cột mốc bắt đầu/kết thúc buổi khám. Tài
liệu này ghi rõ cách xấp xỉ để con số không bị hiểu sai.

## 2. Điều kiện

**Tiên quyết** — vai trò `MANAGER` / `ADMIN`.
**Hậu điều kiện** — không có; read-only.

## 3. Luồng dữ liệu

```
StaffPerformancePage.jsx
  → reportService.staffPerformance(from, to)
  → GET /api/v1/reports/staff-performance?from=&to=
  → ReportController.staffPerformance()  →  defaultRange()
  → ReportServiceImpl.staffPerformance()      @Transactional(readOnly = true)
```

Trả về `List<Map>` — **một dòng cho mỗi bác sĩ trong `doctorRepository.findAll()`**, kể cả
bác sĩ không có hoạt động nào trong kỳ (các KPI khi đó là `0` hoặc `null`).

## 4. Ba nguồn dữ liệu

```java
appts         = appointmentRepository.findByAppointmentTimeBetween(start, end);
prescriptions = prescriptionRepository.findByCreatedAtBetween(start, end);
records       = medicalRecordRepository.findByCreatedAtBetween(start, end);
```

## 5. Công thức từng KPI

### 5.1 `patientsSeen` — số bệnh nhân đã khám

Đếm lịch hẹn `COMPLETED` có gán bác sĩ. Đơn giản, không xấp xỉ.

### 5.2 `onTimeRate` — tỉ lệ đúng giờ

```java
if (a.getCheckInTime() != null && a.getAppointmentTime() != null) {
    if (!a.getCheckInTime().isAfter(a.getAppointmentTime())) agg[0]++;   // đúng giờ
} else {
    noCheckInByDoctor.merge(did, 1L, Long::sum);                        // thiếu mốc check-in
}
agg[1]++;   // mẫu số: MỌI ca COMPLETED
```

**Định nghĩa: đúng giờ = bệnh nhân check-in không muộn hơn giờ hẹn.**

Quyết định quan trọng (UC52-01, ghi trong comment code):

> Ca `COMPLETED` không có check-in **vẫn nằm trong mẫu số và tính là KHÔNG đúng giờ** — không
> có mốc check-in thì không chứng minh được đúng giờ.

Để con số đó không bị hiểu sai, service trả kèm `appointmentsWithoutCheckIn`:

> Con số này lớn nghĩa là tỉ lệ đúng giờ phản ánh **quy trình check-in**, không phải bác sĩ.

`onTimeRate = agg[0] / agg[1]`, trả `null` khi bác sĩ không có ca `COMPLETED` nào (khác 0.0 —
"không có dữ liệu" chứ không phải "0%").

### 5.3 `prescriptionVolume` — số đơn thuốc

Đi vòng qua EMR: `prescription.medicalRecord.doctor` — đơn thuốc không trỏ thẳng tới bác sĩ.
Đơn không gắn EMR sẽ không được tính cho ai.

### 5.4 `avgConsultationMinutes` — thời gian khám trung bình

```java
if (mr.getStatus() != MedicalRecordStatus.COMPLETED) continue;
LocalDateTime endTs = mr.getLockedAt() != null ? mr.getLockedAt() : mr.getUpdatedAt();
long minutes = Duration.between(mr.getCreatedAt(), endTs).toMinutes();
if (minutes < 0) continue;                   // bỏ dữ liệu bẩn
```

**Xấp xỉ:** `lockedAt` là lúc bác sĩ khóa hồ sơ cuối buổi khám (UC-27c) — mốc gần nhất với
"kết thúc buổi khám" mà schema có. Không có `lockedAt` thì lùi về `updatedAt`.

Trung bình = `Math.round(tổng phút / số ca)`, `null` khi không có ca nào đủ dữ liệu.

## 6. Cấu trúc mỗi dòng kết quả

| Key | Kiểu | Ý nghĩa | Khi thiếu dữ liệu |
|---|---|---|---|
| `doctorId` | long | — | — |
| `doctorName` | string | — | — |
| `patientsSeen` | long | Lịch hẹn `COMPLETED` | `0` |
| `prescriptionVolume` | long | Đơn thuốc kê qua EMR | `0` |
| `avgConsultationMinutes` | long \| **null** | Phút, đã làm tròn | `null` |
| `onTimeRate` | double \| **null** | Tỉ lệ 0..1 | `null` |
| `appointmentsWithoutCheckIn` | long | Số ca `COMPLETED` thiếu mốc check-in | `0` |

> `null` ≠ `0`. UI phải hiển thị "—" cho `null`, nếu render thành `0` thì một bác sĩ chưa có
> dữ liệu sẽ trông như đang có hiệu suất tệ nhất.

## 7. Bản đồ code

| Thành phần | File |
|---|---|
| UI | [StaffPerformancePage.jsx](../../frontend/src/pages/manager/StaffPerformancePage.jsx) |
| API client | [reportService.js](../../frontend/src/services/reportService.js) — `staffPerformance()` |
| Controller | [ReportController.java](../../backend/src/main/java/com/ecms/controller/ReportController.java) — `staffPerformance()` |
| Service | [ReportServiceImpl.java](../../backend/src/main/java/com/ecms/service/impl/ReportServiceImpl.java) — `staffPerformance()` |
| Repository | [AppointmentRepository](../../backend/src/main/java/com/ecms/repository/AppointmentRepository.java), [PrescriptionRepository](../../backend/src/main/java/com/ecms/repository/PrescriptionRepository.java), [MedicalRecordRepository](../../backend/src/main/java/com/ecms/repository/MedicalRecordRepository.java) |

## 8. API

| Method | Path | Tham số | Quyền |
|---|---|---|---|
| GET | `/api/v1/reports/staff-performance` | `from`, `to` (optional) | MANAGER, ADMIN |

**Không có bản export `.xlsx`** — khác ba báo cáo còn lại (UC-50, UC-51, UC-53).

## 9. Hạn chế đã biết

- **Chỉ đánh giá bác sĩ.** Điều dưỡng, lễ tân, KTV xét nghiệm không có KPI ở đây. Điểm số của
  họ chỉ xuất hiện trong [UC-53 §byStaff](UC53_FeedbackReport.md).
- `onTimeRate` đo **bệnh nhân đến đúng giờ**, không đo bác sĩ khám đúng giờ. Tên KPI dễ gây
  hiểu nhầm khi trình bày cho ban quản lý.
- `avgConsultationMinutes` tính từ `createdAt` của EMR, tức lúc bác sĩ **mở** hồ sơ. Nếu bác sĩ
  mở hồ sơ sớm rồi để đó, con số bị thổi phồng.
- Bác sĩ đã nghỉ việc vẫn xuất hiện với toàn số 0 — `findAll()` không lọc `status`
  (khác [UC-54](UC54_ApprovePayroll.md) có `isActive()`).
- Ba query nạp toàn bộ entity của kỳ rồi gom trong Java.
