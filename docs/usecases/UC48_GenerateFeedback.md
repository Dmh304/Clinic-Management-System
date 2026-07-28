# UC-48 — Generate Feedback

> Mã trong SRS: **UC-47** · Xem [README](README.md#️-lưu-ý-về-đánh-số-uc)
> Actor: **Patient**
> Business rules: **BR-21** (một đánh giá cho mỗi lượt)

## 1. Mục tiêu

Sau khi một lượt khám hoặc buổi dịch vụ hoàn tất, hệ thống **tự mời** bệnh nhân đánh giá.
Bệnh nhân chấm sao tổng thể, viết nhận xét, và có thể chấm **riêng từng người tham gia**
(bác sĩ, điều dưỡng, lễ tân, KTV xét nghiệm). Đánh giá lưu ở trạng thái `PENDING` và Clinic
Manager được thông báo để duyệt.

Dữ liệu này là đầu vào của [UC-53 Generate Feedback Report](UC53_FeedbackReport.md).

## 2. Điều kiện

**Tiên quyết**
- PRE-2: lượt khám ở trạng thái `COMPLETED` (buổi dịch vụ: `status == "COMPLETED"`).
- PRE-3: bệnh nhân chỉ đánh giá lượt của **chính mình**, và mỗi lượt chỉ một lần (BR-21).

**Hậu điều kiện**
- POST-1: bản ghi `Feedback` lưu với `status = "PENDING"`.
- POST-2: Clinic Manager nhận thông báo in-app loại `FEEDBACK`.

## 3. Luồng chính

### Bước 1 — Hệ thống tự gửi lời mời (scheduler)

[FeedbackRequestScheduler.sendFeedbackRequests()](../../backend/src/main/java/com/ecms/scheduler/FeedbackRequestScheduler.java)

```java
@Scheduled(cron = "0 15 * * * *")   // mỗi giờ, lệch 15 phút để không đụng cron nhắc lịch
```

Hai mốc thời gian, đều cấu hình được:

| Property | Mặc định | Ý nghĩa |
|---|---|---|
| `feedback.request.delay-hours` | 2 | Đợi bao lâu sau giờ khám mới mời — mời lúc bệnh nhân còn ở phòng khám thì chưa đủ trải nghiệm để chấm |
| `feedback.request.max-age-hours` | 72 | **Chặn dưới**: thiếu nó thì lần đầu bật tính năng sẽ gửi mời cho hàng trăm lịch hẹn từ nhiều tháng trước |

Với mỗi lịch hẹn đến hạn, xử lý **độc lập trong try/catch** — một bệnh nhân thiếu email hoặc
SMTP lỗi không được làm dừng cả mẻ:

1. BR-21: đã có đánh giá → chỉ set cờ `feedbackRequestSent`, không mời nữa.
2. Không có bệnh nhân → set cờ, bỏ qua.
3. Có tài khoản → gửi thông báo in-app `FEEDBACK_REQUEST`. Lịch walk-in / đặt hộ không có
   tài khoản thì **bỏ qua in-app nhưng vẫn gửi email**.
4. Gửi email mời kèm link `{frontendBaseUrl}/patient/feedback`.
5. **Đánh dấu `feedbackRequestSent = true` SAU khi gửi** — gửi lỗi thì cờ giữ nguyên để mẻ
   sau thử lại.

`resolveEmail()` dò theo thứ tự: email trong hồ sơ bệnh nhân → email tài khoản đăng nhập →
email người đặt hộ lịch.

### Bước 2-3 — Bệnh nhân mở form

[FeedbackPage.jsx](../../frontend/src/pages/patient/FeedbackPage.jsx)

`GET /api/v1/feedbacks/appointment/{id}/participants` trả về danh sách những người đã tham
gia lượt khám để bệnh nhân chấm riêng từng người.

### Bước 4-5 — Gửi đánh giá

`POST /api/v1/feedbacks` → `FeedbackServiceImpl.submitFeedback()`

Đầu tiên tách nhánh — bắt buộc **đúng một trong hai**:

```java
if (hasAppointment == hasCareSession) throw IllegalArgumentException
```

Cùng một bộ kiểm tra cho cả hai nhánh, **theo thứ tự, trước khi ghi bất cứ thứ gì**:

| # | Kiểm tra | Lỗi |
|---|---|---|
| 1 | PRE-3 — lượt khám thuộc về chính bệnh nhân này | "Bạn chỉ có thể đánh giá lịch hẹn của chính mình" |
| 2 | PRE-2 — trạng thái `COMPLETED` | "Chỉ có thể đánh giá sau khi buổi khám hoàn thành" |
| 3 | BR-21 — `existsByAppointment_Id()` / `existsByCareSession_Id()` | "Lịch hẹn này đã được đánh giá" |

Sau đó dựng `Feedback` với `status = "PENDING"`, gắn `doctor` (nhánh lịch hẹn) **hoặc**
`nurse` (nhánh buổi dịch vụ) — không bao giờ cả hai. Đây là điều kiện để UC-53 tách
`byDoctor` / `byNurse` mà không đếm trùng.

`attachParticipantRatings()` lưu kèm (cascade) điểm cho từng người tham gia vào
`FeedbackParticipantRating` — bỏ qua entry `rating == null`.

Cuối cùng `notificationService.createForManagers(...)` — **best-effort**, lỗi thông báo
không được vứt bỏ đánh giá đã lưu.

## 4. Hai tầng điểm số

Đây là điểm dễ nhầm nhất của use case:

| Tầng | Lưu ở | Ý nghĩa |
|---|---|---|
| **Điểm tổng thể** | `feedback.rating` | Sao cho cả buổi, quy về người dẫn buổi (bác sĩ **hoặc** điều dưỡng) |
| **Điểm từng người** | `feedback_participant_ratings` | Sao cho từng cá nhân — **nơi duy nhất** lễ tân và KTV xét nghiệm được chấm điểm |

Hai tầng này được UC-53 tổng hợp **tách bạch**. Gộp lại sẽ đếm một lần gửi thành hai.

## 5. Bản đồ code

### Backend

| Thành phần | File | Method chính |
|---|---|---|
| Scheduler mời đánh giá | [FeedbackRequestScheduler.java](../../backend/src/main/java/com/ecms/scheduler/FeedbackRequestScheduler.java) | `sendFeedbackRequests()`, `resolveEmail()` |
| Controller | [FeedbackController.java](../../backend/src/main/java/com/ecms/controller/FeedbackController.java) | `submit()`, `participants()`, `myFeedbacks()` |
| Service | [FeedbackServiceImpl.java](../../backend/src/main/java/com/ecms/service/impl/FeedbackServiceImpl.java) | `submitFeedback()`, `submitAppointmentFeedback()`, `submitCareSessionFeedback()`, `attachParticipantRatings()` |
| Entity | [Feedback.java](../../backend/src/main/java/com/ecms/entity/Feedback.java), [FeedbackParticipantRating.java](../../backend/src/main/java/com/ecms/entity/FeedbackParticipantRating.java) | — |
| Repository | [FeedbackParticipantRatingRepository.java](../../backend/src/main/java/com/ecms/repository/FeedbackParticipantRatingRepository.java) | `findByFeedbackCreatedAtBetween()` |

### Frontend

| Màn hình | File |
|---|---|
| Form đánh giá | [FeedbackPage.jsx](../../frontend/src/pages/patient/FeedbackPage.jsx) |
| API client | [feedbackService.js](../../frontend/src/services/feedbackService.js) |

## 6. API

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/v1/feedbacks` | **PATIENT** | Gửi đánh giá |
| GET | `/api/v1/feedbacks/appointment/{id}/participants` | **PATIENT** | Danh sách người tham gia để chấm riêng |
| GET | `/api/v1/feedbacks/my` | **PATIENT** | Đánh giá đã gửi của chính mình |

`SecurityConfig`: `/api/v1/feedbacks/**` → `hasRole("PATIENT")`.
Manager **không** đọc feedback qua API này — họ xem qua [UC-53](UC53_FeedbackReport.md).

## 7. Luồng ngoại lệ

| Tình huống | Xử lý |
|---|---|
| Đánh giá lượt của người khác | `IllegalStateException` (PRE-3) |
| Lượt chưa `COMPLETED` | `IllegalStateException` (PRE-2) |
| Đánh giá lần hai | `IllegalStateException` (BR-21) |
| Gửi cả `appointmentId` lẫn `careSessionId`, hoặc không gửi cái nào | `IllegalArgumentException` |
| SMTP lỗi khi mời | Log lỗi, cờ `feedbackRequestSent` giữ nguyên → mẻ sau thử lại |
| Bệnh nhân không có email nào | `resolveEmail()` trả `null`; in-app vẫn gửi nếu có tài khoản |

## 8. Hạn chế đã biết

- Feedback lưu `PENDING` nhưng **chưa có màn duyệt** — UC-53 tổng hợp toàn bộ, không lọc
  theo `status`.
- Không có cơ chế nhắc lần hai: quá `max-age-hours` (mặc định 72h) là không mời nữa.
- `isAnonymous` được lưu nhưng cần kiểm tra lại xem báo cáo UC-53 có tôn trọng cờ này không.
