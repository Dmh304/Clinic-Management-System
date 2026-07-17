# Thanh toán VietQR tự động — Hướng dẫn cấu hình & demo

> UC-22 Process Payment (SRS 2.3) — ThangNBHE201024 - HE187030

## 1. Vấn đề đang giải quyết

Trước đây màn hình thu phí sinh mã QR VietQR rồi để lễ tân bấm **"Xác nhận thu tiền"**.
Hệ thống tin tưởng tuyệt đối cú bấm đó: hóa đơn chuyển sang `PAID` **kể cả khi bệnh nhân
chưa thực sự chuyển khoản**. Mã QR khi ấy chỉ là một tấm ảnh, không có đường phản hồi
nào từ ngân hàng về hệ thống.

Luồng mới để chính ngân hàng xác nhận:

```
Lễ tân tạo hóa đơn nháp  →  hệ thống sinh mã INV-20250717-0001
        ↓
Mã QR mang nội dung chuyển khoản = "Thanh toan INV-20250717-0001"
        ↓
Bệnh nhân quét & chuyển khoản
        ↓
Tiền vào tài khoản phòng khám  →  cổng thanh toán (SePay) POST webhook về ECMS
        ↓
ECMS dò mã hóa đơn trong nội dung → đối chiếu số tiền → tự gạch nợ (PAID + ISSUED)
        ↓
Màn hình lễ tân đang polling mỗi 3 giây → tự hiện "Đã nhận thanh toán"
```

Điểm mấu chốt: **nội dung chuyển khoản phải chứa mã hóa đơn**. Vì vậy hóa đơn nháp
phải được tạo TRƯỚC khi sinh mã QR — không thể sinh QR từ tên bệnh nhân như trước.

## 2. API

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| `POST` | `/api/v1/payments/webhook` | Public + API key | Cổng thanh toán gọi khi tài khoản có biến động số dư |
| `GET` | `/api/v1/payments/invoice/{id}/status` | ADMIN, RECEPTIONIST, MANAGER, PATIENT | Frontend polling xem đã thanh toán chưa |

> Hệ thống **cố ý không có endpoint "giả lập"** bỏ qua xác thực. Muốn thử luồng khi chạy
> local thì gọi thẳng `/webhook` bằng curl kèm API key (mục 4) — cách đó đi qua đúng code
> path mà SePay sẽ đi, nên một cửa sau vừa thừa vừa là lỗ hổng chỉ chờ bật nhầm.

### Vì sao webhook là public

Cổng thanh toán gọi từ server của họ nên không có JWT của ECMS. Bù lại endpoint được
bảo vệ bằng:

- **API key dùng chung**: header `Authorization: Apikey <payment.webhook.api-key>`.
  Sai key → `401`. Chưa cấu hình key → **từ chối tất cả** (không cho chạy webhook trần).
- **Chống ghi trùng**: `payment_transactions.gateway_txn_id` là `UNIQUE`. Cổng retry
  cùng một giao dịch cũng chỉ gạch nợ đúng một lần.

### Payload webhook (chuẩn SePay)

```json
{
  "id": "92704",
  "gateway": "Vietcombank",
  "transactionDate": "2025-07-17 14:02:37",
  "accountNumber": "0123499999",
  "content": "Thanh toan INV-20250717-0001",
  "transferType": "in",
  "transferAmount": 350000,
  "referenceCode": "MBVCB.3278907687"
}
```

### Kết quả đối soát (`status` trong response)

| Status | Ý nghĩa | Hóa đơn có được gạch nợ? |
|---|---|---|
| `MATCHED` | Khớp mã, đủ tiền | Có → `PAID` + `ISSUED` |
| `UNMATCHED` | Không dò được mã hóa đơn / hóa đơn đã hủy | Không — ghi nhật ký để kế toán xử lý tay |
| `AMOUNT_MISMATCH` | Chuyển thiếu tiền | Không |
| `DUPLICATE` | Cổng bắn lặp, hoặc hóa đơn đã `PAID` | Không |
| `IGNORED` | Giao dịch tiền ra | Không |

Mọi giao dịch **luôn được ghi vào `payment_transactions`**, kể cả khi không khớp hóa đơn.
Tiền đã vào tài khoản thật thì không bao giờ được im lặng bỏ qua.

## 3. Cấu hình

**Backend** — `backend/src/main/resources/application.properties`:

```properties
payment.webhook.api-key=${PAYMENT_WEBHOOK_API_KEY:ecms-local-demo-key-change-me}
```

**Frontend** — `frontend/.env`:

```
VITE_BANK_ID=970436
VITE_BANK_ACCOUNT=1234567890
VITE_BANK_NAME=PHONG KHAM MAT
```

> Để trống `payment.webhook.api-key` thì hệ thống **từ chối mọi webhook**. Đây là chủ ý:
> chạy webhook không bảo vệ nguy hiểm hơn là không chạy được.

## 4. Demo khi chạy local (không cần ngân hàng thật)

Bảng `payment_transactions` được Hibernate tự tạo khi khởi động (`ddl-auto=update`),
hoặc chạy tay phần `22b. payment_transactions` trong `ecms_schema.sql`.

Ý tưởng: **tự đóng vai SePay**, gọi thẳng `/webhook` bằng curl. Không cần internet, không
cần tài khoản ngân hàng, không cần ngrok — mà vẫn đi qua **đúng code path** SePay sẽ đi,
kể cả bước kiểm tra API key.

### Bước 1 — Tạo hóa đơn QR trên giao diện

1. Chạy backend (`./mvnw spring-boot:run`) và frontend (`npm run dev`).
2. Đăng nhập **Lễ tân** → **Thu phí & Hóa đơn** → chọn một lịch hẹn `COMPLETED` chưa có hóa đơn.
3. Nhập các khoản phí → chọn phương thức **QR Code (VietQR)**.
4. Bấm **"Tạo mã QR & chờ chuyển khoản"**.

Mã QR hiện ra kèm dòng *"Đang chờ ngân hàng xác nhận chuyển khoản..."*. Ghi lại mã hóa đơn
(`INV-...`) đang hiện ở dòng **Nội dung**. Để nguyên cửa sổ này — nó đang polling mỗi 3 giây.

### Bước 2 — Đóng vai ngân hàng bắn webhook

Mở terminal khác, thay `INV-20250717-0001` và `transferAmount` cho khớp hóa đơn:

```bash
curl -X POST http://localhost:8080/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Apikey ecms-local-demo-key-change-me" \
  -d '{
    "id": "92704",
    "gateway": "Vietcombank",
    "transactionDate": "2025-07-17 14:02:37",
    "accountNumber": "1234567890",
    "content": "Thanh toan INV-20250717-0001",
    "transferType": "in",
    "transferAmount": 350000,
    "referenceCode": "MBVCB.3278907687"
  }'
# → {"success":true,"status":"MATCHED"}
```

Quay lại trình duyệt: trong ~3 giây hóa đơn **tự** chuyển sang **Đã thanh toán** và modal tự
đóng — **không ai bấm "xác nhận thu tiền"**. Đây là điểm cần nhấn khi thuyết trình.

### Bước 3 — Chứng minh các ràng buộc an toàn

Ba lệnh dưới đây chứng minh idempotency và bảo mật, chạy ngay sau bước 2:

```bash
# Bắn lại y hệt (cùng "id") → chặn, KHÔNG gạch nợ hai lần
# → {"success":true,"status":"DUPLICATE"}

# Sai API key → 401, không đụng vào hóa đơn
curl -X POST http://localhost:8080/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Apikey sai-key" \
  -d '{"id":"99","content":"Thanh toan INV-20250717-0001","transferAmount":350000,"transferType":"in"}'
# → 401 {"success":false,"message":"API key không hợp lệ"}

# Chuyển thiếu tiền (đổi "id" thành số mới) → AMOUNT_MISMATCH, hóa đơn KHÔNG thành PAID
#   "transferAmount": 100000  → {"success":true,"status":"AMOUNT_MISMATCH"}
```

Kiểm tra vết đối soát trong DB — mọi giao dịch đều được ghi, kể cả cái không khớp:

```sql
SELECT gateway_txn_id, matched_invoice_code, amount, status, note
FROM payment_transactions ORDER BY received_at DESC;
```

### Vì sao không dùng ngrok để demo trực tiếp

Ngrok là cách thật nhất (mục 5) nhưng **không nên làm phương án chính khi bảo vệ**: link đổi
mỗi lần restart, wifi hội trường có thể chặn, SePay trễ vài giây, và chuyển tiền thật trước
hội đồng mà lỗi thì không có đường lùi. Dùng ngrok để **quay video/chụp màn hình từ trước**
làm bằng chứng đã chạy với ngân hàng thật; còn demo trực tiếp thì curl vào localhost.

## 5. Đấu nối ngân hàng thật (khi có tài khoản)

1. Đăng ký [SePay](https://sepay.vn), liên kết tài khoản ngân hàng của phòng khám.
2. Cấu hình webhook trong SePay:
   - URL: `https://<domain-cua-ban>/api/v1/payments/webhook`
   - Kiểu xác thực: **API Key**, giá trị = `payment.webhook.api-key`.
3. Điền `VITE_BANK_ID` / `VITE_BANK_ACCOUNT` đúng tài khoản đã liên kết.
4. Tạo hóa đơn trên web, quét mã QR và chuyển khoản thật 1.000đ để thử.

Khi demo local mà muốn nhận webhook thật từ SePay, dùng `ngrok http 8080` rồi lấy URL
public của ngrok điền vào cấu hình webhook.

## 6. Kiểm thử

`backend/src/test/java/com/ecms/service/PaymentServiceImplTest.java` — 11 test phủ các
tình huống dễ gây mất tiền hoặc gạch nợ sai:

- Khớp mã + đủ tiền → `PAID` + `ISSUED`, mã tham chiếu lấy từ ngân hàng
- App ngân hàng viết hoa, bỏ dấu gạch ngang (`INV202507170001`) → vẫn dò ra mã
- Cổng bắn trùng → không gạch nợ lần hai
- Chuyển thiếu tiền → không đánh dấu đã thanh toán
- Nội dung không có mã hóa đơn → vẫn ghi nhật ký để đối soát tay
- Tiền vào cho hóa đơn đã hủy → cảnh báo hoàn tiền thủ công
- Sai / thiếu / chưa cấu hình API key → từ chối

```bash
cd backend && ./mvnw test -Dtest=PaymentServiceImplTest
```
