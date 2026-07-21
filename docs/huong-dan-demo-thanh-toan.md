# Hướng dẫn demo thanh toán VietQR (UC-22)

> Runbook thực hành — ThangNBHE201024. Chi tiết kỹ thuật xem thêm [payment-webhook-demo.md](payment-webhook-demo.md).

Có **2 cách demo**:

| Cách | Khi nào dùng | Cần gì |
|---|---|---|
| **A. curl vào localhost** | Bảo vệ trực tiếp, không có mạng/ngân hàng thật | Chỉ cần backend chạy |
| **B. ngrok + SePay** | Chuyển khoản thật, quay video làm bằng chứng | ngrok + tài khoản SePay + ngân hàng thật |

Khuyến nghị: **demo trực tiếp bằng cách A** (nhanh, offline, không rủi ro), dùng cách B để quay video từ trước.

---

## 0. Chuẩn bị chung (cả 2 cách)

1. **Database**: đã chạy `ecms_schema.sql` + `ecms_data_seed.sql` (có bảng `payment_transactions`, cột `lab_orders.service_id`).
2. **Backend** chạy port 8080:
   ```bash
   cd backend && ./mvnw spring-boot:run
   ```
3. **Frontend** chạy port 5173:
   ```bash
   cd frontend && npm run dev
   ```
4. **Tài khoản đăng nhập** (mật khẩu chung `Password@123`):
   - Lễ tân: `ngobachthang2k6@gmail.com`
   - Bệnh nhân demo: `trangthangtuong@gmail.com` (có 4 lịch hẹn chưa có hóa đơn)

> ⚠️ Mỗi lần sửa file `.java` hoặc `application.properties` **phải restart backend**. Sửa `.env` phải restart `npm run dev`.

---

## Cách A — Demo bằng curl vào localhost (khuyến nghị)

Tự đóng vai cổng thanh toán SePay, gọi thẳng webhook. Đi qua **đúng code path** SePay sẽ đi (kể cả kiểm tra API key), không cần internet.

### Bước 1 — Lễ tân tạo hóa đơn QR

1. Đăng nhập **Lễ tân** → **Hóa đơn & Thu phí** → tab **Tạo hóa đơn**.
2. Chọn một lịch hẹn của **Trang Thắng Tường** → bấm nút thu phí.
3. Modal tự đổ sẵn: **Dịch vụ khám + Xét nghiệm + Thuốc** (nếu chưa đổ, bấm tag *"Khôi phục hóa đơn gốc"*).
4. Phương thức thanh toán → **QR Code (VietQR)** → bấm **"Tạo mã QR & chờ chuyển khoản"**.
5. Ghi lại **mã hóa đơn** (`INV-...`) và **tổng tiền** đang hiện. Để nguyên cửa sổ — nó đang polling mỗi 3 giây.

### Bước 2 — Đóng vai ngân hàng bắn webhook

Mở terminal khác, thay `INV-...` và `transferAmount` cho khớp hóa đơn vừa tạo:

```bash
curl -X POST http://localhost:8080/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Apikey ecms-local-demo-key-change-me" \
  -d '{
    "id": "tx-demo-001",
    "gateway": "VietinBank",
    "transactionDate": "2026-07-18 14:02:37",
    "accountNumber": "100882681700",
    "content": "Thanh toan INV-20260718-0003",
    "transferType": "in",
    "transferAmount": 238000,
    "referenceCode": "FT26xxxx"
  }'
# → {"success":true,"status":"MATCHED"}
```

Quay lại trình duyệt: sau ~3 giây hóa đơn **tự** chuyển **"Đã thanh toán"**, modal tự đóng.
Điểm nhấn khi thuyết trình: **không ai bấm "xác nhận thu tiền"** — chính webhook gạch nợ.

### Bước 3 — Chứng minh an toàn (idempotency + bảo mật)

```bash
# 1) Bắn LẠI y hệt (trùng "id") → chặn, không gạch nợ 2 lần
#    → {"success":true,"status":"DUPLICATE"}

# 2) Sai API key → 401, không đụng hóa đơn
curl -X POST http://localhost:8080/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Apikey sai-key" \
  -d '{"id":"tx-x","content":"Thanh toan INV-20260718-0003","transferAmount":238000,"transferType":"in"}'
#    → 401 {"success":false,"message":"API key không hợp lệ"}

# 3) Chuyển THIẾU tiền (đổi "id" mới) → AMOUNT_MISMATCH, hóa đơn KHÔNG thành PAID
#    "transferAmount": 100000 → {"success":true,"status":"AMOUNT_MISMATCH"}
```

Kiểm tra nhật ký đối soát — mọi giao dịch đều được ghi, kể cả cái không khớp:

```sql
SELECT gateway_txn_id, matched_invoice_code, amount, status, note
FROM payment_transactions ORDER BY received_at DESC;
```

---

## Cách B — Demo thật bằng ngrok + SePay

Để SePay (trên internet) gọi được webhook vào máy local, cần mở đường hầm bằng ngrok.

### Bước 1 — Sửa tài khoản ngân hàng THẬT (bắt buộc)

Mặc định QR trỏ vào tài khoản **mẫu** (Vietcombank 1234567890). Phải đổi sang tài khoản đã liên kết SePay — sửa **cả 2 nơi**:

`frontend/.env`:
```
VITE_BANK_ID=970415
VITE_BANK_ACCOUNT=100882681700
VITE_BANK_NAME=<TÊN CHỦ TK, viết hoa không dấu>
```

`backend/src/main/resources/application.properties`:
```properties
payment.bank.id=970415
payment.bank.account=100882681700
payment.bank.account-name=<TÊN CHỦ TK>
```

> Mã ngân hàng Napas: VietinBank `970415`, Vietcombank `970436`, MB `970422`, BIDV `970418`, Techcombank `970407`.

Sửa xong **restart cả backend lẫn `npm run dev`**.

### Bước 2 — Mở ngrok

```bash
ngrok http 8080
```

Copy dòng `Forwarding` → link `https://xxxx.ngrok-free.app`.

> **Free tier**: link đổi mỗi lần tắt/bật → phải cập nhật lại SePay. Muốn cố định: ngrok dashboard → Domains → tạo static domain, rồi chạy `ngrok http 8080 --url=ten-cua-ban.ngrok-free.app`.

### Bước 3 — Cấu hình webhook trong SePay

Dashboard SePay → phần **Webhook**:
- **URL**: `https://xxxx.ngrok-free.app/api/v1/payments/webhook` (đủ cả path)
- **Kiểu xác thực**: API Key
- **Giá trị**: `ecms-local-demo-key-change-me` (SePay gửi header `Authorization: Apikey ...`)
- Liên kết tài khoản VietinBank vào SePay.

### Bước 4 — Chuyển khoản thật

1. Lễ tân tạo hóa đơn QR (tạo tổng đúng **2.000đ** để test rẻ — hệ thống chặn nếu chuyển thiếu).
2. Quét QR bằng app ngân hàng, chuyển đúng 2.000đ, **giữ nguyên nội dung chuyển khoản**.
3. SePay nhận tiền → bắn webhook → hóa đơn tự **"Đã thanh toán"**.

### Debug — mở `http://127.0.0.1:4040`

ngrok inspector ghi lại **mọi request SePay gửi**: header, body, response. Có nút **Replay** để bắn lại. Webhook không chạy thì vào đây biết ngay:
- Không thấy request nào → SePay chưa gọi (sai URL / tiền chưa vào).
- `401` → sai API key.
- `200` + `status: UNMATCHED` → nội dung chuyển khoản không có mã hóa đơn.

---

## Bảng kết quả đối soát (field `status`)

| Status | Ý nghĩa | Gạch nợ? |
|---|---|---|
| `MATCHED` | Khớp mã + đủ tiền | ✅ → PAID + ISSUED |
| `UNMATCHED` | Không dò được mã / hóa đơn đã hủy | ❌ ghi nhật ký, kế toán xử lý tay |
| `AMOUNT_MISMATCH` | Chuyển thiếu tiền | ❌ |
| `DUPLICATE` | Bắn lặp / hóa đơn đã PAID | ❌ |
| `IGNORED` | Giao dịch tiền ra | ❌ |

---

## Xử lý sự cố nhanh

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Webhook trả `401` | Sai/thiếu API key | Header đúng `Authorization: Apikey ecms-local-demo-key-change-me` |
| `UNMATCHED` | Nội dung không có mã `INV-...` | Kiểm tra `content` chứa đúng mã hóa đơn |
| `AMOUNT_MISMATCH` | Chuyển thiếu tiền | `transferAmount` ≥ tổng hóa đơn |
| Hóa đơn không tự đổi PAID trên UI | Backend chưa chạy webhook / chưa restart | Restart backend; trang polling 3s |
| Email QR không tới Gmail | SMTP chưa cấu hình | Set env `MAIL_USERNAME` + `MAIL_APP_PASSWORD` (Gmail App Password) |
| QR trỏ sai tài khoản | Bank config còn giá trị mẫu | Sửa `VITE_BANK_*` + `payment.bank.*` (Cách B bước 1) |
