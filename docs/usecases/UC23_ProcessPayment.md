# UC-23 — Process Payment

> Mã trong SRS: **UC-22** · Xem [README](README.md#️-lưu-ý-về-đánh-số-uc)
> Actor: **Receptionist** (chính), **Patient** (nhánh QR tự thanh toán)
> Business rules: **BR-09**, **BR-10**, **BR-11**, **BR-15**

## 1. Mục tiêu

Lập hóa đơn cho một lượt khám (hoặc một gói dịch vụ) và thu tiền theo một trong hai phương thức:

- **ALT-1 — Tiền mặt:** lễ tân thu tại quầy rồi phát hành hóa đơn.
- **ALT-2 — VietQR / chuyển khoản:** hệ thống sinh mã QR mang mã hóa đơn làm nội dung
  chuyển khoản, cổng thanh toán gọi webhook khi tiền về, hệ thống **tự gạch nợ**.

Nguyên tắc xuyên suốt: **chỉ ngân hàng mới xác nhận được tiền QR**. Lễ tân không có
cách nào đánh dấu một hóa đơn QR là đã trả.

## 2. Điều kiện

**Tiên quyết**
- Lượt khám tồn tại và chưa có hóa đơn còn hiệu lực (`status <> 'CANCELLED'`).
- Với nhánh QR: `payment.bank.*` và `payment.webhook.api-key` đã cấu hình.

**Hậu điều kiện (khi thành công)**
- `invoice.status = ISSUED`, `invoice.paymentStatus = PAID`, `paidAt` được ghi.
- Lượt khám chuyển `COMPLETED` (POST-3), trừ khi đang `CANCELLED`.
- Email hóa đơn được gửi (UC-24), thông báo in-app cho bệnh nhân.
- Nhánh QR: một dòng trong `payment_transaction` ghi lại giao dịch ngân hàng.

## 3. Luồng chính

### Bước 1-2 — Gợi ý dòng phí

`GET /api/v1/invoices/appointment/{id}/suggested-items` → `InvoiceServiceImpl.getSuggestedItems()`

Read-only. Gom dịch vụ đã đặt + thuốc bác sĩ kê để modal mở ra đã điền sẵn.
Nếu lượt khám từng có hóa đơn `CANCELLED` thì khôi phục lại các dòng phí của hóa đơn đó.

### Bước 3 — Tạo hóa đơn DRAFT

`POST /api/v1/invoices` → `InvoiceServiceImpl.createInvoice()`

1. **Nguồn hóa đơn** — bắt buộc đúng một trong `appointmentId` / `subscriptionId`.
2. **Chống trùng (E1)** — `existsByAppointment_IdAndStatusNot(id, "CANCELLED")`.
   Loại `CANCELLED` để hóa đơn đã hủy không khóa vĩnh viễn việc lập lại.
3. **Tính tiền (BR-11)** — `subtotal = unitPrice × quantity`, phân vào 3 nhóm:
   - `SERVICE` → `serviceFee`
   - `MEDICINE`, `GLASSES` → `medicineFee`
   - `LAB`, `OTHER`, **và mọi type lạ** → `labFee` *(nhánh `else` để không mất tiền)*
4. **Giảm giá (BR-15 / UC-43)** — có `discountCode` thì gọi
   `discountCampaignService.redeemForOrder()` và lấy số của **server**, đè lên số gõ tay.
   Sau đó kẹp về `[0, subTotal]`.
   > Kẹp **im lặng**, không ném lỗi: chiến dịch khuyến mãi lớn hơn hóa đơn nhỏ là bình
   > thường. Đánh đổi đã chấp nhận — gõ nhầm 500000 thay vì 50000 là miễn phí cả hóa đơn.
   > Test BR-15 phải kỳ vọng `total = 0`.
5. **Mã hóa đơn** — `generateInvoiceCode()` sinh `INV-yyyyMMdd-XXXX`, chuỗi reset mỗi ngày
   theo `countByDatePrefix()`. Hai lễ tân bấm cùng lúc → unique index bắn
   `DataIntegrityViolationException`, controller dịch thành thông báo "thử lại".
6. **Trạng thái ban đầu — điểm rẽ nhánh:**

```java
status        = "DRAFT"
paymentStatus = "VIET_QR".equals(paymentMethod) ? "PENDING_PAYMENT" : "UNPAID"
```

7. Chỉ hóa đơn `PENDING_PAYMENT` mới gọi `notifyPaymentRequested()` — hóa đơn tiền mặt
   thì bệnh nhân đang đứng ở quầy.

### Bước 4-6 — Thu tiền

Xem [§4 ALT-1](#4-alt-1--tiền-mặt) và [§5 ALT-2](#5-alt-2--vietqr--webhook).

## 4. ALT-1 — Tiền mặt

`PATCH /api/v1/invoices/{id}/issue` với `{"paymentMethod":"CASH"}` → `InvoiceServiceImpl.issueInvoice()`

```java
if (!"DRAFT".equals(invoice.getStatus())) throw ...        // chống phát hành 2 lần

boolean waitingForBank = PENDING_PAYMENT || PAYMENT_FAILED || PARTIALLY_PAID;
if (waitingForBank && "VIET_QR".equals(effectiveMethod)) throw ...   // ← chốt BR-10
```

**Chốt chặn BR-10 là phần quan trọng nhất của use case này.** Hóa đơn đang chờ ngân hàng
mà vẫn giữ phương thức `VIET_QR` thì lễ tân không được xác nhận thanh toán — nếu cho phép,
lễ tân có thể xác nhận số tiền ngân hàng chưa hề báo về.

Ba trạng thái đều bị chặn vì cùng nghĩa "còn nợ thật". Nhưng **đổi sang `CASH` vẫn hợp lệ**:
bệnh nhân bỏ chuyển khoản, ra quầy trả tiền mặt, và lúc đó có một con người cầm tiền chịu
trách nhiệm.

Sau đó: `ISSUED` + `PAID` + `paidAt`, `markAppointmentCompleted()`, rồi controller gửi email
(bọc try/catch — tiền đã thu, lỗi SMTP không được rollback).

## 5. ALT-2 — VietQR + webhook

### 5.1 Sinh mã QR (FE)

`handleCreateQrInvoice()` — [InvoicePage.jsx](../../frontend/src/pages/receptionist/InvoicePage.jsx)

**Cố tình KHÔNG gọi issue.** Chỉ tạo draft để lấy mã hóa đơn, vì nội dung chuyển khoản
phải chứa mã đó thì webhook mới đối chiếu được.

```js
buildTransferContent(code) => `SEVQR ${code}`     // prefix SEVQR bắt buộc với SePay+VietinBank
buildVietQrUrl(amount, code) =>
  `https://img.vietqr.io/image/${BANK_ID}-${BANK_ACCOUNT}-compact2.png?amount=...&addInfo=...`
```

### 5.2 Xác thực webhook

`PaymentServiceImpl.isValidApiKey()` — chạy **trước mọi xử lý**, kể cả trước khi ghi journal.

- **Fail closed:** key chưa cấu hình → từ chối tất cả (không phải "cho qua hết").
- `MessageDigest.isEqual()` — so sánh constant-time chống timing attack.

### 5.3 `handleWebhook()` — 6 bước trong 1 `@Transactional`

| # | Kiểm tra | Kết quả |
|---|---|---|
| 0 | thiếu `id` giao dịch | ném `IllegalArgumentException` |
| 1 | `existsByGatewayTxnId()` — cổng retry khi không nhận được HTTP 200 | `DUPLICATE` |
| 2 | `transferType != "in"` — lệnh chi của phòng khám | `IGNORED` |
| 3 | `extractInvoiceCode()` không ra kết quả, hoặc mã không tồn tại | `UNMATCHED` |
| 4a | hóa đơn đã `PAID` → `markRefundRequired()` | `DUPLICATE` |
| 4b | hóa đơn đã `CANCELLED` → `markRefundRequired()` | `UNMATCHED` |
| 5 | lũy kế chưa đủ → invoice `PARTIALLY_PAID` + `notifyShortPayment()` | `PARTIAL` |
| 6 | đủ tiền → tất toán | `MATCHED` / `OVERPAID` |

**Nguyên tắc "tiền không bao giờ biến mất":** mọi nhánh đều ghi một dòng vào
`payment_transaction` rồi mới return — không im lặng trả 200 rồi vứt đi.

**Regex khôi phục mã hóa đơn** (`normalizeInvoiceCode()`):

```java
Pattern.compile("INV[-\\s]?(\\d{8})[-\\s]?(\\d{4})", CASE_INSENSITIVE)
```

`[-\s]?` là mấu chốt: app ngân hàng thường viết hoa nội dung và bỏ dấu gạch ngang, nên
`INV202607280003` và `INV-20260728-0003` phải khớp như nhau. Thứ tự ưu tiên nguồn:
`code` (cổng tự parse) → `content` → `description`.

**Thanh toán từng phần (E2):**

```java
previouslyReceived = sumReceivedForInvoice(invoiceId);   // MATCHED, PARTIAL, OVERPAID, AMOUNT_MISMATCH
totalReceived      = previouslyReceived + received;
```

Query cộng dồn loại `DUPLICATE` (phải hoàn), `UNMATCHED` (chưa gắn hóa đơn), `IGNORED` (tiền ra).
`PARTIALLY_PAID` tồn tại để phân biệt "đã trả một phần" với `PENDING_PAYMENT` ("chưa chuyển gì").
`notifyShortPayment()` báo số thiếu **sau khi trừ phần đã trả** — nếu báo số của riêng lần
này thì bệnh nhân sẽ chuyển thừa.

**Bước 6 — tất toán:** `VIET_QR` + `paymentReference` + `PAID` + `paidAt`; `DRAFT → ISSUED`;
lượt khám → `COMPLETED`; `emailStatus = SENDING` rồi `invoiceMailDispatcher.dispatch()`;
thông báo in-app (bọc try/catch).

**MATCHED vs OVERPAID:** `excess = totalReceived − expected`. Tách riêng vì query đối soát
**loại trừ MATCHED** — gộp overpaid vào MATCHED thì khoản tiền thừa sẽ vô hình với cả kế toán.
Phần thừa tính trên **lũy kế**: trả 300k rồi 200k cho hóa đơn 400k là thừa 100k, lần chuyển
200k tự nó không thừa đồng nào.

### 5.4 FE nhận biết đã trả — polling

Backend không đẩy ngược về browser. FE hỏi `GET /payments/invoice/{id}/status` mỗi **3 giây**,
tự dừng sau **5 phút** (`POLL_TIMEOUT_MS`). Hết giờ chỉ **dừng hỏi**, hóa đơn vẫn
`PENDING_PAYMENT` và webhook vẫn gạch nợ nếu bệnh nhân chuyển muộn. Nút "Kiểm tra lại" thủ
công cũng chỉ **đọc** trạng thái.

`catch {}` rỗng trong vòng polling là chủ ý — lỗi mạng một nhịp thì vòng sau thử lại.

## 6. Đối soát & hoàn tiền

`GET /api/v1/payments/reconciliation` → `findNeedingAttention()`:

```sql
WHERE t.status <> 'IGNORED'
  AND (t.status <> 'MATCHED' OR t.refundStatus = 'REQUIRED')
```

Vế `OR` chính là thứ kéo các dòng `OVERPAID` vào danh sách — chúng đã gạch nợ hóa đơn
ngon lành nhưng vẫn nợ bệnh nhân tiền thừa.

`PATCH /api/v1/payments/transactions/{id}/refund` → `confirmRefund()`:
- chặn hoàn hai lần (`refundStatus == "DONE"`)
- chặn hoàn nhiều hơn số ngân hàng đã chuyển về
- **người xác nhận lấy từ JWT**, không từ request body → không gán nhầm cho người khác
- ECMS **không tự chuyển tiền**; đây chỉ là audit trail

## 7. Bản đồ code

### Backend

| Thành phần | File | Method chính |
|---|---|---|
| Controller hóa đơn | [InvoiceController.java](../../backend/src/main/java/com/ecms/controller/InvoiceController.java) | `createInvoice()`, `issueInvoice()`, `cancelInvoice()`, `getSuggestedItems()` |
| Service hóa đơn | [InvoiceServiceImpl.java](../../backend/src/main/java/com/ecms/service/impl/InvoiceServiceImpl.java) | `createInvoice()`, `issueInvoice()`, `generateInvoiceCode()`, `markAppointmentCompleted()`, `notifyPaymentRequested()` |
| Controller thanh toán | [PaymentController.java](../../backend/src/main/java/com/ecms/controller/PaymentController.java) | `handleWebhook()`, `getPaymentStatus()`, `getReconciliationList()`, `confirmRefund()` |
| Service thanh toán | [PaymentServiceImpl.java](../../backend/src/main/java/com/ecms/service/impl/PaymentServiceImpl.java) | `isValidApiKey()`, `handleWebhook()`, `getPaymentStatus()`, `confirmRefund()`, `extractInvoiceCode()`, `normalizeInvoiceCode()` |
| Repository | [PaymentTransactionRepository.java](../../backend/src/main/java/com/ecms/repository/PaymentTransactionRepository.java) | `existsByGatewayTxnId()`, `sumReceivedForInvoice()`, `findNeedingAttention()` |
| Entity | [Invoice.java](../../backend/src/main/java/com/ecms/entity/Invoice.java), [PaymentTransaction.java](../../backend/src/main/java/com/ecms/entity/PaymentTransaction.java) | — |

### Frontend

| Màn hình | File |
|---|---|
| Lễ tân lập hóa đơn + QR | [InvoicePage.jsx](../../frontend/src/pages/receptionist/InvoicePage.jsx) |
| Bệnh nhân tự thanh toán | [MyInvoicesPage.jsx](../../frontend/src/pages/patient/MyInvoicesPage.jsx) |
| Đối soát giao dịch | [ReconciliationPage.jsx](../../frontend/src/pages/receptionist/ReconciliationPage.jsx) |
| API client | [paymentService.js](../../frontend/src/services/paymentService.js), [invoiceService.js](../../frontend/src/services/invoiceService.js) |
| Redux | [invoiceSlice.js](../../frontend/src/store/slices/invoiceSlice.js) |

## 8. API

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/v1/invoices/appointment/{id}/suggested-items` | RECEPTIONIST+ | Gợi ý dòng phí |
| POST | `/api/v1/invoices` | RECEPTIONIST+ | Tạo hóa đơn DRAFT |
| PATCH | `/api/v1/invoices/{id}/issue` | RECEPTIONIST+ | Phát hành + thu tiền mặt |
| PATCH | `/api/v1/invoices/{id}/cancel` | RECEPTIONIST+ | Hủy mềm (BR-09) |
| POST | `/api/v1/payments/webhook` | **PUBLIC** + API key | Cổng ngân hàng báo tiền về |
| GET | `/api/v1/payments/invoice/{id}/status` | authenticated | Polling trạng thái |
| GET | `/api/v1/payments/reconciliation` | authenticated | Worklist đối soát |
| PATCH | `/api/v1/payments/transactions/{id}/refund` | authenticated | Ghi nhận hoàn tiền |

**Vì sao webhook trả 200 cho gần hết mọi trường hợp:** cổng coi 200 là "đã nhận", khác 200
là retry. Chỉ sai API key mới trả 401; các kết quả nghiệp vụ (không tìm thấy hóa đơn, chuyển
thiếu) vẫn trả 200 kèm `status` trong body — để cổng đừng retry mãi thứ không bao giờ thành công.

## 9. Sơ đồ trạng thái

**`invoice.status`**

```
DRAFT ──► ISSUED
   └────► CANCELLED        (chỉ từ DRAFT; soft cancel — BR-09)
```

**`invoice.paymentStatus`**

```
UNPAID          ──(lễ tân thu tiền mặt)──────────────────────► PAID
PENDING_PAYMENT ──(webhook, chuyển thiếu)──► PARTIALLY_PAID ──► PAID
PENDING_PAYMENT ──(webhook, đủ tiền)──────────────────────────► PAID
```

**`payment_transaction.status`**
`MATCHED` · `PARTIAL` · `OVERPAID` · `UNMATCHED` · `DUPLICATE` · `IGNORED`

**`payment_transaction.refundStatus`**
`null → REQUIRED → DONE`

## 10. Luồng ngoại lệ

| Mã | Tình huống | Xử lý |
|---|---|---|
| E1 | Lượt khám đã có hóa đơn | `IllegalStateException` "Lịch hẹn này đã có hóa đơn" |
| E2 | Chuyển thiếu tiền | `PARTIAL` + `PARTIALLY_PAID` + thông báo số còn thiếu |
| — | Cổng retry webhook | `DUPLICATE`, không gạch nợ lại |
| — | Sai API key | HTTP 401, không ghi gì vào journal |
| — | Chuyển thừa | `OVERPAID` + `refundStatus = REQUIRED` |
| — | Chuyển vào hóa đơn đã hủy | `UNMATCHED` + cần hoàn tiền |
| — | Hai lễ tân tạo hóa đơn cùng lúc | Unique index → thông báo "thử lại" |

## 11. Hạn chế đã biết

- **`sumOutstanding()` (UC-49) cộng `totalAmount`, không trừ phần đã trả.** Hóa đơn 400k đã
  chuyển 300k vẫn tính đủ 400k vào công nợ. Muốn chính xác phải trừ `sumReceivedForInvoice()`.
- Trạng thái `PAYMENT_FAILED` là dữ liệu cũ; luồng hiện tại ghi `PARTIALLY_PAID`. Vẫn được
  `issueInvoice()` coi là "đang chờ ngân hàng" để không bỏ sót.
- `AMOUNT_MISMATCH` cũng là status cũ, vẫn nằm trong `sumReceivedForInvoice()` vì tiền thật
  đã vào tài khoản.
- ECMS không thực hiện chuyển tiền hoàn — chỉ ghi audit trail.
