# UC-53 — Generate Feedback Report

> Mã trong SRS: **UC-52** · Xem [README](README.md#️-lưu-ý-về-đánh-số-uc)
> Actor: **Clinic Manager**
> Màn hình: `/manager/feedback-report`
> Business rules: **BR-21** (giữ tỉ lệ phản hồi có biên)

## 1. Mục tiêu

Tổng hợp đánh giá của bệnh nhân trong một kỳ: điểm trung bình, tỉ lệ phản hồi, điểm theo bác
sĩ / điều dưỡng, và điểm theo **vai trò** cùng **từng cá nhân**.

Nguồn dữ liệu là những gì [UC-48 Generate Feedback](UC48_GenerateFeedback.md) ghi vào.

## 2. Điều kiện

**Tiên quyết** — vai trò `MANAGER` / `ADMIN`.
**Hậu điều kiện** — không có; read-only.

## 3. Luồng dữ liệu

```
FeedbackReportPage.jsx
  → reportService.feedbackReport(from, to)
  → GET /api/v1/reports/feedback?from=&to=
  → ReportController.feedback()  →  defaultRange()
  → ReportServiceImpl.feedbackReport()      @Transactional(readOnly = true)
```

## 4. Hai tầng điểm số — **cố tình tách riêng**

Đây là điểm cốt lõi của use case. Trích javadoc:

> `byDoctor` / `byNurse` average the visit's overall star rating, attributed to whoever led
> the visit. `byRole` / `byStaff` average the per-participant stars the patient gave to each
> individual (UC-48) — the only place a receptionist or lab technician is ever scored.
> **Merging them would count one submission twice.**

| Tầng | Nguồn bảng | Ai được chấm |
|---|---|---|
| Tổng thể buổi khám | `feedback.rating` | Bác sĩ (lịch hẹn) **hoặc** điều dưỡng (buổi dịch vụ) |
| Từng người tham gia | `feedback_participant_ratings` | Bác sĩ, điều dưỡng, **lễ tân, KTV xét nghiệm** |

## 5. Công thức tính

### 5.1 Điểm tổng thể

```java
for (Feedback f : feedbacks) {
    sumRating += r;
    if      (f.getDoctor() != null) accumulate(perDoctorAgg, doctorName, r);
    else if (f.getNurse()  != null) accumulate(perNurseAgg,  nurseName,  r);
}
averageRating = totalResponses > 0 ? (double) sumRating / totalResponses : 0.0;
```

Một feedback buổi dịch vụ **không có** bác sĩ, một feedback lịch hẹn **không có** điều dưỡng
— nên mỗi lần gửi rơi vào **đúng một** trong hai bảng. Feedback không có cả hai (dữ liệu cũ)
vẫn được đếm vào tổng nhưng không vào bảng nào.

`accumulate()` gom `key → [sum, count]`; `ratingRow()` trả `{label, responses, averageRating}`.

### 5.2 Điểm từng người tham gia

```java
for (FeedbackParticipantRating pr : findByFeedbackCreatedAtBetween(start, end)) {
    accumulate(perRoleAgg,  role,               r);
    accumulate(perStaffAgg, role + "|" + name,  r);   // khóa ghép để không nhầm 2 vai trò trùng tên
}
```

Khóa ghép `"ROLE|name"` được tách lại bằng `split("\\|", 2)` khi dựng kết quả.

> Không có vòng lặp này thì điểm từng người **được ghi vào DB rồi không bao giờ đọc ra**.

**`byStaff` sắp xếp điểm thấp lên trước:**

> Manager đang tìm ai cần hỗ trợ, danh sách không sắp xếp sẽ chôn thông tin đó sau người
> ngẫu nhiên được chấm đầu tiên.

### 5.3 Tỉ lệ phản hồi

```java
rateable     = completedAppointments + completedCareSessions;
responseRate = rateable > 0 ? (double) totalResponses / rateable : 0.0;
```

**Buổi dịch vụ nằm trong mẫu số** — nếu chỉ lấy lịch hẹn thì feedback của điều dưỡng bị cộng
lên một mẫu số chỉ-có-lịch-hẹn và đẩy tỉ lệ **vượt quá 100%**.

BR-21 (một đánh giá mỗi lượt) là thứ giữ cho tỉ số này có biên trên.

## 6. Cấu trúc kết quả

| Key | Kiểu | Mô tả |
|---|---|---|
| `from`, `to` | date | Kỳ báo cáo |
| `totalResponses` | long | Số feedback trong kỳ |
| `averageRating` | double | Trung bình sao tổng thể |
| `completedAppointments` | long | Lịch hẹn `COMPLETED` trong kỳ |
| `completedCareSessions` | long | Buổi dịch vụ `COMPLETED` trong kỳ |
| `rateableVisits` | long | Mẫu số = tổng hai dòng trên |
| `responseRate` | double | 0..1 |
| `byDoctor` | list | `{doctorName, responses, averageRating}` |
| `byNurse` | list | `{nurseName, responses, averageRating}` |
| `byRole` | list | `{role, responses, averageRating}` |
| `byStaff` | list | `{staffName, role, responses, averageRating}` — **sắp tăng dần theo điểm** |

## 7. Xuất Excel

`GET /api/v1/reports/feedback/export` → `exportFeedbackXlsx()`. Chạy lại `feedbackReport()`
với cùng kỳ, stream qua `writeXlsx()`.

## 8. Bản đồ code

| Thành phần | File |
|---|---|
| UI | [FeedbackReportPage.jsx](../../frontend/src/pages/manager/FeedbackReportPage.jsx) |
| API client | [reportService.js](../../frontend/src/services/reportService.js) — `feedbackReport()`, `exportFeedback()` |
| Controller | [ReportController.java](../../backend/src/main/java/com/ecms/controller/ReportController.java) — `feedback()`, `exportFeedback()` |
| Service | [ReportServiceImpl.java](../../backend/src/main/java/com/ecms/service/impl/ReportServiceImpl.java) — `feedbackReport()`, `accumulate()`, `ratingRow()` |
| Repository | [FeedbackRepository](../../backend/src/main/java/com/ecms/repository/FeedbackRepository.java), [FeedbackParticipantRatingRepository](../../backend/src/main/java/com/ecms/repository/FeedbackParticipantRatingRepository.java), [CareSessionRepository](../../backend/src/main/java/com/ecms/repository/CareSessionRepository.java) |

## 9. API

| Method | Path | Tham số | Quyền |
|---|---|---|---|
| GET | `/api/v1/reports/feedback` | `from`, `to` (optional) | MANAGER, ADMIN |
| GET | `/api/v1/reports/feedback/export` | như trên | MANAGER, ADMIN |

Lưu ý phân quyền: `/api/v1/feedbacks/**` (UC-48) là `hasRole("PATIENT")`, còn đường đọc của
manager là `/api/v1/reports/feedback` — **hai namespace khác nhau**.

## 10. Hạn chế đã biết

- Báo cáo tổng hợp **mọi feedback bất kể `status`**, kể cả bản còn `PENDING` chưa được duyệt.
- `byDoctor` / `byNurse` gộp theo **tên**, không theo id — hai người trùng tên bị cộng dồn.
- Cờ `isAnonymous` của UC-48 không được kiểm tra ở đây; cần rà lại xem báo cáo có làm lộ danh
  tính người đánh giá ẩn danh không.
- Mẫu số `rateable` đếm mọi lượt `COMPLETED` trong kỳ, kể cả lượt vừa xong chưa tới hạn được
  mời đánh giá (scheduler đợi mặc định 2 giờ) → tỉ lệ phản hồi của kỳ vừa kết thúc bị thấp giả.
- Feedback cũ không gắn bác sĩ lẫn điều dưỡng chỉ vào `totalResponses`, không truy được về ai.
