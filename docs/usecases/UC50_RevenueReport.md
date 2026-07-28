# UC-50 — Generate Revenue Report

> Mã trong SRS: **UC-49** · Xem [README](README.md#️-lưu-ý-về-đánh-số-uc)
> Actor: **Clinic Manager**
> Màn hình: `/manager/revenue`
> Business rules: **BR-10** (nền tảng để con số đáng tin)

## 1. Mục tiêu

Tổng hợp doanh thu theo kỳ, bóc tách theo **nhóm dịch vụ**, **bác sĩ** và **phương thức
thanh toán**, kèm xu hướng 12 tháng và bản xuất `.xlsx`.

Đây là điểm nối trực tiếp với [UC-23 Process Payment](UC23_ProcessPayment.md): mọi con số
trên màn hình đều đến từ các hóa đơn mà UC-23 đã tất toán.

## 2. Điều kiện

**Tiên quyết** — vai trò `MANAGER` / `ADMIN`.
**Hậu điều kiện** — không có; read-only.

## 3. Luồng dữ liệu

```
RevenueReportPage.jsx
  → reportService.revenue(from, to)
  → GET /api/v1/reports/revenue?from=&to=
  → ReportController.revenue()  →  defaultRange()
  → ReportServiceImpl.revenueReport()      @Transactional(readOnly = true)
```

### `defaultRange()` — xử lý khoảng ngày

- Mặc định: **đầu tháng hiện tại → hôm nay**.
- `from > to` → **ném lỗi**, không chạy tiếp:

> Mọi truy vấn `BETWEEN` sẽ khớp 0 dòng nên báo cáo hiện toàn số 0, người dùng tưởng kỳ đó
> không có dữ liệu chứ không biết mình chọn sai ngày.

## 4. Truy vấn nguồn — hai điều kiện quyết định tất cả

```java
List<Invoice> paid = invoiceRepository.findByPaymentStatusAndPaidAtBetween("PAID", start, end);
```

| Điều kiện | Hệ quả |
|---|---|
| **chỉ `PAID`** | Hóa đơn `PARTIALLY_PAID` (bệnh nhân chuyển thiếu) **không** được tính vào doanh thu, dù tiền đã thực sự vào tài khoản. Đúng tinh thần BR-10: chỉ ghi nhận doanh thu khi hóa đơn tất toán đủ. |
| **lọc theo `paidAt`**, không phải `generatedAt` | Doanh thu ghi nhận vào **ngày tiền về**. Hóa đơn lập cuối tháng 6 mà bệnh nhân chuyển khoản đầu tháng 7 sẽ nằm ở báo cáo **tháng 7**. |

## 5. Công thức tính

### 5.1 Tổng hợp một vòng lặp

```java
for (Invoice i : paid) {
    totalRevenue += nz(i.getTotalAmount());
    serviceFee   += nz(i.getServiceFee());
    labFee       += nz(i.getLabFee());
    medicineFee  += nz(i.getMedicineFee());

    byMethod.merge(method != null ? method : "UNKNOWN", amount, BigDecimal::add);
    byDoctor.merge(doctorName != null ? doctorName : "—", amount, BigDecimal::add);
}
```

`nz()` là helper null-safe: thiếu một khoản phí thì đóng góp 0 thay vì ném `NullPointerException`
giữa chừng.

Ba nhóm `SERVICE` / `LAB` / `MEDICINE` chính là ba cột mà `createInvoice()` của
[UC-23](UC23_ProcessPayment.md#bước-3--tạo-hóa-đơn-draft) phân loại theo BR-11.

`byPaymentMethod` chỉ có `CASH` và `VIET_QR` — giá trị do `issueInvoice()` (tiền mặt) hoặc
`handleWebhook()` (QR) ghi.

### 5.2 Trung bình mỗi hóa đơn

```java
avgPerInvoice = paid.isEmpty() ? ZERO
              : totalRevenue.divide(BigDecimal.valueOf(paid.size()), 0, RoundingMode.HALF_UP);
```

Làm tròn về **số nguyên đồng** (scale 0).

### 5.3 Top hóa đơn

Sắp giảm dần theo `totalAmount`, **cắt 30 dòng**.

### 5.4 Xu hướng theo tháng

```java
int year       = to.getYear();                          // năm chứa ngày "đến"
int upToMonth  = (year == năm hiện tại) ? tháng hiện tại : 12;
```

Chạy **một query riêng cho cả năm** (`01/01 → 31/12`), cộng vào `monthly[getMonthValue()]`,
rồi chỉ trả về từ tháng 1 tới `upToMonth` — để biểu đồ không kéo dài đường 0 qua các tháng
tương lai.

> Lưu ý: xu hướng luôn tính theo **năm của ngày `to`**, độc lập với `from`. Chọn kỳ
> 15/12/2025 → 15/01/2026 thì biểu đồ vẽ năm **2026**.

### 5.5 `topEntry()`

Trả `{name, amount}` của mục cao nhất trong một map bóc tách; map rỗng → `name = null`,
`amount = 0`.

## 6. Cấu trúc kết quả

| Key | Kiểu | Mô tả |
|---|---|---|
| `from`, `to`, `year` | date/int | Kỳ báo cáo |
| `invoiceCount` | int | Số hóa đơn `PAID` trong kỳ |
| `totalRevenue` | BigDecimal | Tổng doanh thu |
| `averagePerInvoice` | BigDecimal | Trung bình/hóa đơn |
| `byServiceCategory` | map | `SERVICE` / `LAB` / `MEDICINE` |
| `byDoctor` | map | Doanh thu quy về bác sĩ của lượt khám |
| `byPaymentMethod` | map | `CASH` / `VIET_QR` |
| `topServiceCategory`, `topDoctor` | `{name, amount}` | Mục cao nhất |
| `monthlyTrend` | list | `{month, revenue}` |
| `paidInvoices` | list | Top 30 `{code, doctorName, paymentMethod, amount}` |

## 7. Xuất Excel

`GET /api/v1/reports/revenue/export` → `exportRevenueXlsx()`

**Chạy lại `revenueReport()`** với cùng khoảng ngày, để file xuất ra luôn khớp với những gì
đang hiện trên màn hình. Ghi qua `writeXlsx()`, stream thẳng vào `HttpServletResponse`.

FE nhận `responseType: 'blob'`.

## 8. Bản đồ code

| Thành phần | File |
|---|---|
| UI | [RevenueReportPage.jsx](../../frontend/src/pages/manager/RevenueReportPage.jsx) |
| API client | [reportService.js](../../frontend/src/services/reportService.js) — `revenue()`, `exportRevenue()` |
| Controller | [ReportController.java](../../backend/src/main/java/com/ecms/controller/ReportController.java) — `revenue()`, `exportRevenue()`, `defaultRange()` |
| Service | [ReportServiceImpl.java](../../backend/src/main/java/com/ecms/service/impl/ReportServiceImpl.java) — `revenueReport()`, `topEntry()`, `nz()`, `exportRevenueXlsx()`, `writeXlsx()` |
| Repository | [InvoiceRepository.java](../../backend/src/main/java/com/ecms/repository/InvoiceRepository.java) — `findByPaymentStatusAndPaidAtBetween()` |

## 9. API

| Method | Path | Tham số | Quyền |
|---|---|---|---|
| GET | `/api/v1/reports/revenue` | `from`, `to` (ISO `yyyy-MM-dd`, optional) | MANAGER, ADMIN |
| GET | `/api/v1/reports/revenue/export` | như trên | MANAGER, ADMIN |

## 10. Hạn chế đã biết

- **Tiền đã nhận của hóa đơn `PARTIALLY_PAID` không xuất hiện ở bất kỳ đâu trong báo cáo này.**
  Đó là tiền thật đã vào tài khoản nhưng chưa được ghi nhận doanh thu. Nếu cần con số
  "tiền mặt thực thu", phải cộng thêm từ `payment_transaction`.
- `byDoctor` quy toàn bộ giá trị hóa đơn về bác sĩ của lượt khám, **kể cả tiền thuốc và
  xét nghiệm** — không phải doanh thu do bác sĩ trực tiếp tạo ra.
- Hóa đơn từ gói dịch vụ (`subscriptionId`, không có `appointment`) rơi vào nhóm `"—"` trong
  `byDoctor`.
- Xu hướng tháng chạy thêm một query toàn năm mỗi lần gọi — chưa cache.
- `paidInvoices` cắt cứng 30 dòng, không phân trang và không báo cho người dùng biết là đã cắt.
