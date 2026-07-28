# Đặc tả Use Case — phần ThangNB (HE201024)

Tài liệu kỹ thuật cho các UC thuộc phạm vi thanh toán · hóa đơn điện tử · đánh giá · báo cáo quản lý · bảng lương.
Mỗi file mô tả: luồng nghiệp vụ, bản đồ code (file + method), API, công thức tính và các hạn chế đã biết.

## Danh sách

| File | UC | Tên | Actor chính |
|---|---|---|---|
| [UC23_ProcessPayment.md](UC23_ProcessPayment.md) | UC-23 | Process Payment | Receptionist, Patient |
| [UC24_DeliverInvoice.md](UC24_DeliverInvoice.md) | UC-24 | Deliver Invoice | Receptionist, Patient |
| [UC48_GenerateFeedback.md](UC48_GenerateFeedback.md) | UC-48 | Generate Feedback | Patient |
| [UC49_OperationalDashboard.md](UC49_OperationalDashboard.md) | UC-49 | View Real-time Operational Analytics Dashboard | Clinic Manager |
| [UC50_RevenueReport.md](UC50_RevenueReport.md) | UC-50 | Generate Revenue Report | Clinic Manager |
| [UC51_PatientStatistics.md](UC51_PatientStatistics.md) | UC-51 | View Patient Volume Statistics and Trends | Clinic Manager |
| [UC52_StaffPerformance.md](UC52_StaffPerformance.md) | UC-52 | Monitor Staff Performance Dashboard | Clinic Manager |
| [UC53_FeedbackReport.md](UC53_FeedbackReport.md) | UC-53 | Generate Feedback Report | Clinic Manager |
| [UC54_ApprovePayroll.md](UC54_ApprovePayroll.md) | UC-54 | Approve Payroll | Clinic Manager |

## ⚠️ Lưu ý về đánh số UC

Mã UC trong **code và trong `docs/diagrams/`** lệch **+1** so với `srs_text.txt` / `EYES_CLINIC_PROJECT_INSTRUCTIONS.md`:

| Tên use case | Mã trong code + diagrams | Mã trong SRS |
|---|---|---|
| Process Payment | UC-23 | UC-22 |
| Deliver Invoice | UC-24 | UC-23 |
| Generate Feedback | UC-48 | UC-47 |
| Real-time Operational Dashboard | UC-49 | UC-48 |
| Generate Revenue Report | UC-50 | UC-49 |
| Patient Volume Statistics | UC-51 | UC-50 |
| Staff Performance Dashboard | UC-52 | UC-51 |
| Generate Feedback Report | UC-53 | UC-52 |
| Approve Payroll | UC-54 | UC-53 |

Business rule cũng lệch tương tự: code ghi **BR-17 (Payroll Authority)**, SRS ghi **BR-18 (Payroll Approval Authority)**.

**Tài liệu này dùng mã của code**, để khớp với javadoc trong source và với các file
`docs/diagrams/UC24_DeliverInvoice_*.puml`, `docs/diagrams/UC54_ApprovePayroll_*.puml` đã có sẵn.
Mỗi file đều ghi lại mã SRS tương ứng ở đầu trang.

> Cảnh báo: `docs/diagrams/` đang tồn tại **hai hệ đánh số song song** — `UC54_ApprovePayroll_*.puml`
> (hệ code) và `UC54_ManageLabTestCatalogue_*.puml` (hệ SRS) trùng số nhưng khác use case.
> Cần thống nhất trước khi nộp.

## Business rules được nhắc tới

| Mã | Nội dung | Nơi thực thi |
|---|---|---|
| BR-09 | No Hard Delete — bản ghi bị hủy vẫn giữ trong DB | `cancelInvoice()`, `approve()` payroll |
| BR-10 | Invoice Issuance — chỉ PAID khi đã thu đủ tiền | `handleWebhook()`, `issueInvoice()` |
| BR-11 | Invoice Calculation — Total = Khám + Xét nghiệm + Thuốc − Giảm giá | `createInvoice()` |
| BR-15 | Một hóa đơn chỉ áp một mức giảm giá | `createInvoice()` |
| BR-17 | Payroll Authority — chỉ Clinic Manager được duyệt lương | `SecurityConfig` |
| BR-21 | Một lượt khám chỉ được đánh giá một lần | `submitFeedback()` |
