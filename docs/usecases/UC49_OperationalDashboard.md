# UC-49 — View Real-time Operational Analytics Dashboard

> Mã trong SRS: **UC-48** · Xem [README](README.md#️-lưu-ý-về-đánh-số-uc)
> Actor: **Clinic Manager** (ADMIN cũng truy cập được)
> Màn hình: `/manager/dashboard`

## 1. Mục tiêu

Một màn hình duy nhất cho biết phòng khám **đang** chạy thế nào: tiến độ lịch hẹn hôm nay,
hàng đợi từng bác sĩ, đơn thuốc chờ phát, công nợ hóa đơn, xét nghiệm đang xử lý.

Khác mọi báo cáo còn lại: **không nhận tham số ngày**, luôn là hôm nay, và **tự làm mới mỗi
60 giây**.

## 2. Điều kiện

**Tiên quyết** — đăng nhập với vai trò `MANAGER` hoặc `ADMIN`
(`SecurityConfig`: `/api/v1/reports/**` → `hasAnyRole("MANAGER","ADMIN")`).

**Hậu điều kiện** — không có. Use case này **read-only tuyệt đối**, không áp business rule nào.

## 3. Luồng dữ liệu

```
ManagerDashboard.jsx
  → reportService.operationalDashboard()
  → GET /api/v1/reports/dashboard
  → ReportController.dashboard()
  → ReportServiceImpl.operationalDashboard()      @Transactional(readOnly = true)
```

**Một request duy nhất** trả về toàn bộ màn hình.

Tự làm mới: `setInterval(load, 60000)`, dọn bằng `clearInterval` khi unmount.
Nhãn "Cập nhật lúc HH:mm" là **giờ máy client** (`setUpdatedAt(new Date())`), không phải
giờ server.

## 4. Ánh xạ UI ↔ dữ liệu

| Ô trên màn hình | Key JSON | Nguồn |
|---|---|---|
| Lịch hẹn hôm nay | `todayTotalAppointments` | `appointmentRepository.countByDate()` |
| Đã hoàn thành | `todayCompletedAppointments` | `countByDateAndStatus(COMPLETED)` |
| % tiến độ | `progressPercent` | công thức §5.1 |
| Đơn thuốc chờ cấp phát | `pendingPrescriptions` | `prescriptionRepository.countByStatus(PENDING)` |
| Hóa đơn chưa thanh toán | `outstandingInvoices` | `invoiceRepository.countOutstanding()` |
| — số tiền | `outstandingInvoiceAmount` | `invoiceRepository.sumOutstanding()` |
| Xét nghiệm đang xử lý | `labOrdersInProgress` | `labOrderRepository.countByStatus(IN_PROGRESS)` |
| Bảng "Hàng đợi theo bác sĩ" | `doctorQueue` | §5.2 |
| "N bệnh nhân đang chờ tư vấn" | `waitingPatientsTotal` | cộng dồn trong §5.2 |
| Panel "Đơn chờ cấp phát" | `pendingPrescriptionList` | §5.3 |

## 5. Công thức tính

Mốc thời gian dùng chung:

```java
LocalDateTime start = today.atStartOfDay();        // 00:00:00
LocalDateTime end   = today.atTime(LocalTime.MAX); // 23:59:59.999999999
```

### 5.1 Lịch hẹn & tiến độ

```sql
countByDate:          WHERE a.appointmentTime >= :start AND a.appointmentTime < :end
countByDateAndStatus: ... AND a.status = :status
```

```java
progressPercent = total > 0 ? Math.round(completed * 1000.0 / total) / 10.0 : 0.0
```

Nhân 1000 rồi chia 10 là thủ thuật **làm tròn 1 chữ số thập phân** (`Math.round` chỉ trả số
nguyên): 5/17 = 29.41% → `Math.round(294.1)/10 = 29.4`. Chia 0 được chặn bằng `total > 0`.

> `countByDate` đếm **mọi trạng thái, kể cả `CANCELLED`** — nên "Lịch hẹn hôm nay" là số lịch
> *đã đặt*, không phải số lịch *còn hiệu lực*.

### 5.2 Hàng đợi theo bác sĩ

Không dùng query đếm — **nạp toàn bộ lịch hẹn hôm nay rồi gom trong Java**:

```java
for (Appointment a : findByAppointmentTimeBetween(start, end)) {
    if (a.getDoctor() == null) continue;             // bỏ lịch chưa gán bác sĩ
    long[] c = agg.computeIfAbsent(doctorId, k -> new long[2]);   // [waiting, inProgress]
    if (status == WAITING)          { c[0]++; waitingTotal++; }
    else if (status == IN_PROGRESS) { c[1]++; }
}
```

Trạng thái hiển thị:

```java
c[1] > 0 → "Đang khám"     // đang có người trong phòng
c[0] > 0 → "Sẵn sàng"      // có người xếp hàng
còn lại  → "Tạm nghỉ"
```

**Chỉ bác sĩ có lịch hôm nay mới xuất hiện** — `doctorMap` chỉ được nạp từ chính vòng lặp này.

> Enum có 6 trạng thái (`PENDING, CONFIRMED, WAITING, IN_PROGRESS, COMPLETED, CANCELLED`)
> nhưng bảng này **chỉ đếm `WAITING` và `IN_PROGRESS`**. Vì vậy "17 lịch hẹn hôm nay" mà mọi
> bác sĩ đều "Tạm nghỉ" là **hoàn toàn bình thường**: các lịch đó đang ở `PENDING`/`CONFIRMED`
> — đã đặt nhưng bệnh nhân chưa check-in tại quầy.

### 5.3 Đơn chờ cấp phát

- Số đếm: `countByStatus(PrescriptionStatus.PENDING)` — **không giới hạn**
- Danh sách: `findByStatusOrderByCreatedAtAsc(PENDING)` rồi **`.limit(8)`** cho vừa panel
- `code` là chuỗi ghép `"RX-" + id`, không phải cột trong DB

Nên có 20 đơn chờ thì thẻ hiện **20** còn panel chỉ liệt kê **8**.

### 5.4 Công nợ hóa đơn

```sql
countOutstanding(): SELECT COUNT(i)                  WHERE i.paymentStatus <> 'PAID' AND i.status <> 'CANCELLED'
sumOutstanding():   SELECT COALESCE(SUM(i.totalAmount), 0)  -- cùng điều kiện
```

- `<> 'CANCELLED'` — hóa đơn đã hủy vẫn nằm trong bảng (BR-09), không loại ra sẽ thành
  **công nợ ảo**.
- `<> 'PAID'` — gom cả `UNPAID`, `PENDING_PAYMENT` **và `PARTIALLY_PAID`**, nên mọi hóa đơn
  chuyển thiếu từ [UC-23](UC23_ProcessPayment.md) đều hiện ở đây.
- `COALESCE(...,0)` để `SUM` không trả `null` khi không có dòng nào.

## 6. Quy ước hiển thị (frontend)

| Hàm | Hành vi |
|---|---|
| `pad2(n)` | `String(n).padStart(2,'0')` → `0` thành `"00"`, `17` giữ nguyên; `null` → `"—"` |
| `fmtAmount(v)` | `< 1.000.000` → `"967.000 đ"`; từ 1 triệu → `"1,5 triệu đ"` |
| `initials(name)` | Bỏ tiền tố "BS.", lấy chữ cái đầu của 2 từ cuối |
| `fmtTime(iso)` | `toLocaleTimeString('vi-VN')` |

**Thanh "Tải công việc"** có sàn cứng:

```js
maxWait = Math.max(1, ...queue.map(q => q.waiting || 0))     // tránh chia 0
width   = `${Math.max(6, (q.waiting / maxWait) * 100)}%`     // sàn 6%
```

Khi mọi bác sĩ đều 0 → `0/1 = 0%` → bị nâng lên **6%**. Đoạn màu nhỏ thấy trên UI lúc đó là
**thuần trang trí, không mang dữ liệu**.

## 7. Bản đồ code

| Thành phần | File |
|---|---|
| UI | [ManagerDashboard.jsx](../../frontend/src/pages/manager/ManagerDashboard.jsx) |
| API client | [reportService.js](../../frontend/src/services/reportService.js) — `operationalDashboard()` |
| Controller | [ReportController.java](../../backend/src/main/java/com/ecms/controller/ReportController.java) — `dashboard()` |
| Service | [ReportServiceImpl.java](../../backend/src/main/java/com/ecms/service/impl/ReportServiceImpl.java) — `operationalDashboard()` |
| Repository | [AppointmentRepository](../../backend/src/main/java/com/ecms/repository/AppointmentRepository.java), [InvoiceRepository](../../backend/src/main/java/com/ecms/repository/InvoiceRepository.java) |

## 8. API

| Method | Path | Quyền |
|---|---|---|
| GET | `/api/v1/reports/dashboard` | MANAGER, ADMIN |

Không có tham số. Không có bản export.

## 9. Hạn chế đã biết

- ⚠️ **Chỉ 2/5 thẻ thực sự lọc theo ngày**, dù tiêu đề trang ghi "trong hôm nay":

  | Lọc theo hôm nay | Toàn bộ lịch sử |
  |---|---|
  | Lịch hẹn hôm nay, Đã hoàn thành, Hàng đợi bác sĩ | Đơn thuốc chờ, Hóa đơn chưa thanh toán, Xét nghiệm đang xử lý |

  "02 hóa đơn chưa thanh toán" là **công nợ tồn đọng của cả phòng khám từ trước tới nay**.
  Đây là chủ ý hợp lý (công nợ cũ vẫn phải thấy), chỉ là nhãn UI không nói rõ.

- ⚠️ **`sumOutstanding()` cộng `totalAmount`, không trừ phần đã trả.** Hóa đơn 400k mà bệnh
  nhân đã chuyển 300k (`PARTIALLY_PAID`) vẫn được tính đủ **400k**, dù thực tế chỉ còn nợ
  100k. Muốn chính xác phải trừ `sumReceivedForInvoice()` của
  [PaymentTransactionRepository](../../backend/src/main/java/com/ecms/repository/PaymentTransactionRepository.java).

- `findByAppointmentTimeBetween()` nạp cả entity rồi gom trong Java thay vì `GROUP BY` — chấp
  nhận được với quy mô một phòng khám/ngày, nhưng không co giãn.

- Query dùng `appointmentTime < end` với `end = LocalTime.MAX` (23:59:59.999999999) nên lịch
  hẹn rơi đúng nanosecond cuối ngày bị bỏ sót. Thực tế không xảy ra vì lịch đặt theo phút.

- Làm mới bằng polling 60s, không phải WebSocket — "trực tiếp" ở đây là gần-thời-gian-thực.
