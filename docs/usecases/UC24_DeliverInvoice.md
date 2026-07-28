# UC-24 — Deliver Invoice

> Mã trong SRS: **UC-23** · Xem [README](README.md#️-lưu-ý-về-đánh-số-uc)
> Actor: **Receptionist** (gửi/in), **Patient** (tải về)
> Diagram có sẵn: [UC24_DeliverInvoice_ClassDiagram.puml](../diagrams/UC24_DeliverInvoice_ClassDiagram.puml) · [SequenceDiagram](../diagrams/UC24_DeliverInvoice_SequenceDiagram.puml)
> Business rules: **BR-10**

## 1. Mục tiêu

Giao hóa đơn điện tử cho bệnh nhân sau khi UC-23 hoàn tất. Ba kênh:

- **Normal flow** — email tự động ngay khi thu tiền xong
- **ALT-1** — lễ tân in ra giấy (PDF)
- **ALT-2** — bệnh nhân tự tải PDF từ "Hóa đơn của tôi"

Điểm đặc biệt: hệ thống gửi **hai loại email khác nhau**, tự chọn theo `paymentStatus`.

## 2. Điều kiện

**Tiên quyết**
- Hóa đơn tồn tại; với email thì bệnh nhân phải có địa chỉ email.
- `spring.mail.*` và `payment.bank.*` đã cấu hình.

**Hậu điều kiện**
- `invoice.emailStatus` ∈ `SENDING → SENT | FAILED`.
- Bệnh nhân nhận được email (kèm PDF nếu đã thanh toán).

## 3. Hai loại tài liệu

`InvoiceMailDispatcher.dispatch()` định tuyến theo `paymentStatus` — **mọi call site đều
nhận đúng tài liệu mà không phải tự biết mình muốn loại nào**:

| Điều kiện | Tài liệu | Đính kèm | Template |
|---|---|---|---|
| `paymentStatus == PAID` | Biên lai hóa đơn đã thanh toán | **PDF hóa đơn** | `InvoiceEmailTemplate.buildPaidInvoice()` |
| còn lại | Thông báo thanh toán (kèm số tài khoản + nội dung chuyển khoản) | không | `InvoiceEmailTemplate.buildPaymentReminder()` |

Lý do bản nhắc thanh toán không đính PDF: dưới BR-10 hóa đơn **chưa được phát hành**, chưa
có chứng từ nào để gửi.

Số tài khoản trong email đọc từ **cùng các property** mà ảnh VietQR được dựng
(`payment.bank.id` / `.account` / `.account-name`), nên nội dung chuyển khoản mà bệnh nhân
được hướng dẫn **chắc chắn khớp** với thứ webhook sẽ đối chiếu.

`bankDisplayName()` map mã Napas sang tên ngân hàng (`970415 → VietinBank`, …) vì một mã
thô như "970415" không có ý nghĩa gì với bệnh nhân.

## 4. Vì sao gửi mail chạy nền

`@Async("mailExecutor")` trên `dispatch()`:

1. **Gmail SMTP có thể mất vài giây.** Gửi trên request thread sẽ giữ HTTP response mở tới
   khi SMTP xong → frontend trông như bị treo dù mail đã đi.
2. **SMTP nằm ngoài mọi DB transaction**, nên mail server chậm không giữ (pin) connection
   HikariCP suốt thời gian đó.

Luồng: endpoint đánh dấu `emailStatus = SENDING` rồi **trả về ngay**; worker gửi mail và tự
ghi kết quả `SENT` / `FAILED`.

`dispatch()` **không bao giờ ném lại lỗi** — lỗi mail không được phép hủy một khoản tiền đã
thực sự thu. Thất bại chỉ lật `emailStatus = FAILED`, và chính cờ đó làm hiện nút gửi lại (E1).

## 5. Luồng

### 5.1 Normal flow — gửi tự động khi thanh toán xong

Hai điểm gọi, cùng một hàm:

| Nguồn | Vị trí | Điều kiện |
|---|---|---|
| Tiền mặt | `InvoiceController.issueInvoice()` | `paymentStatus == PAID` && có email |
| VietQR | `PaymentServiceImpl.handleWebhook()` bước 6 | có email |

Cả hai đều bọc `try/catch` nuốt lỗi.

### 5.2 Gửi thủ công / gửi lại (E1)

`POST /api/v1/invoices/{id}/send-email` → `markEmailSending()` + `dispatch()`, trả về ngay.

Dùng được cho cả hóa đơn chưa thanh toán — khi đó gửi bản **nhắc thanh toán**. Lễ tân bấm
"Gửi mã QR qua email" chính là đường này.

### 5.3 ALT-1 / ALT-2 — PDF

`GET /api/v1/invoices/{id}/pdf` → `InvoicePdfService.generateInvoicePdf()`

- Render bằng **OpenPDF**, trả `byte[]` thẳng cho controller stream ra
  `application/pdf` — **không chạm filesystem**.
- `Content-Disposition: inline; filename="hoa-don-{code}.pdf"` → trình duyệt mở luôn
  thay vì ép tải về.
- Font Unicode được nạp tường minh vì base font mặc định của PDF **không render được dấu
  tiếng Việt**.

`attachPdf()` render từ **DTO đang có trong tay**, không render lại theo id — để PDF không
thể lệch với số liệu in trong thân email.

## 6. Bản đồ code

### Backend

| Thành phần | File | Method chính |
|---|---|---|
| Controller | [InvoiceController.java](../../backend/src/main/java/com/ecms/controller/InvoiceController.java) | `sendEmail()`, `downloadPdf()`, `issueInvoice()` |
| Worker gửi mail | [InvoiceMailDispatcher.java](../../backend/src/main/java/com/ecms/service/impl/InvoiceMailDispatcher.java) | `dispatch()`, `attachPdf()`, `bankDisplayName()` |
| Template HTML | [InvoiceEmailTemplate.java](../../backend/src/main/java/com/ecms/service/impl/InvoiceEmailTemplate.java) | `buildPaidInvoice()`, `buildPaymentReminder()` |
| Sinh PDF | [InvoicePdfService.java](../../backend/src/main/java/com/ecms/service/InvoicePdfService.java) | `generateInvoicePdf()` |
| Trạng thái email | [InvoiceServiceImpl.java](../../backend/src/main/java/com/ecms/service/impl/InvoiceServiceImpl.java) | `markEmailSending()`, `markEmailStatus()` |
| Thread pool | [AsyncConfig.java](../../backend/src/main/java/com/ecms/config/AsyncConfig.java) | bean `mailExecutor` |

### Frontend

| Màn hình | File |
|---|---|
| Lễ tân — gửi email / in | [InvoicePage.jsx](../../frontend/src/pages/receptionist/InvoicePage.jsx) |
| Bệnh nhân — tải PDF | [MyInvoicesPage.jsx](../../frontend/src/pages/patient/MyInvoicesPage.jsx) |
| API client | [invoiceService.js](../../frontend/src/services/invoiceService.js) |

## 7. API

| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/v1/invoices/{id}/send-email` | Gửi / gửi lại email hóa đơn (async) |
| GET | `/api/v1/invoices/{id}/pdf` | Stream PDF, hiển thị inline |

## 8. Sơ đồ trạng thái `emailStatus`

```
null ──► SENDING ──► SENT
             └─────► FAILED ──(bấm gửi lại)──► SENDING ──► ...
```

`SENDING` được ghi **trước** khi worker chạy, nên UI biết ngay là "đang gửi" mà không phải
chờ SMTP.

## 9. Luồng ngoại lệ

| Mã | Tình huống | Xử lý |
|---|---|---|
| E1 | SMTP lỗi / bệnh nhân sai email | `emailStatus = FAILED`, hóa đơn **vẫn PAID**; lễ tân gửi lại hoặc in |
| — | Bệnh nhân không có email | Bỏ qua gửi tự động (`hasEmail` guard); vẫn in / tải PDF được |
| — | Gọi send-email cho hóa đơn chưa trả | Gửi bản **nhắc thanh toán** thay vì biên lai |

## 10. Hạn chế đã biết

- Không có cơ chế retry tự động — thất bại phải bấm gửi lại thủ công.
- `emailStatus` chỉ phản ánh việc **SMTP nhận thư**, không đảm bảo bệnh nhân đã mở
  (không có tracking pixel / webhook bounce).
- Ảnh QR trong email nhắc thanh toán phụ thuộc dịch vụ ngoài `img.vietqr.io`; client
  chặn ảnh ngoài sẽ không thấy mã, nhưng số tài khoản + nội dung chuyển khoản vẫn ở dạng text.
