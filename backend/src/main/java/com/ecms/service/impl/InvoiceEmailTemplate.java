package com.ecms.service.impl;

import com.ecms.dto.response.InvoiceResponse;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Sinh nội dung HTML của email hóa đơn điện tử từ InvoiceResponse (DTO).
 *
 * Tách khỏi InvoiceServiceImpl để việc gửi email chạy nền (InvoiceMailDispatcher)
 * không phụ thuộc vào entity/transaction — build từ dữ liệu đã load sẵn.
 */
final class InvoiceEmailTemplate {

    private static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private InvoiceEmailTemplate() {
    }

    static String build(InvoiceResponse inv) {
        NumberFormat vnd = NumberFormat.getInstance(new Locale("vi", "VN"));

        StringBuilder items = new StringBuilder();
        if (inv.getItems() != null) {
            for (InvoiceResponse.InvoiceItemResponse item : inv.getItems()) {
                items.append("<tr>")
                     .append("<td style='padding:6px 8px;border-bottom:1px solid #e2e8f0'>").append(nz(item.getDescription())).append("</td>")
                     .append("<td style='padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:center'>").append(item.getQuantity()).append("</td>")
                     .append("<td style='padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right'>").append(vnd.format(item.getUnitPrice())).append("₫</td>")
                     .append("<td style='padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right'>").append(vnd.format(item.getSubtotal())).append("₫</td>")
                     .append("</tr>");
            }
        }

        boolean hasDiscount = inv.getDiscountAmount() != null
                && inv.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0;

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='font-family:Arial,sans-serif;color:#1e293b;margin:0;padding:0'>"
             + "<div style='max-width:600px;margin:24px auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden'>"
             + "<div style='background:#4f46e5;color:#fff;padding:24px 32px'>"
             + "<h2 style='margin:0;font-size:20px'>Hóa đơn khám bệnh</h2>"
             + "<p style='margin:4px 0 0;opacity:.85'>Mã hóa đơn: <strong>" + nz(inv.getInvoiceCode()) + "</strong></p></div>"
             + "<div style='padding:24px 32px'>"
             + "<table style='width:100%;margin-bottom:16px'><tr>"
             + "<td><strong>Bệnh nhân:</strong> " + nz(inv.getPatientName()) + "<br>"
             + "<strong>SĐT:</strong> " + nz(inv.getPatientPhone()) + "</td>"
             + "<td style='text-align:right'><strong>Bác sĩ:</strong> " + (inv.getDoctorName() != null ? inv.getDoctorName() : "—") + "<br>"
             + "<strong>Ngày thanh toán:</strong> " + (inv.getPaidAt() != null ? inv.getPaidAt().format(DTF) : "—") + "</td>"
             + "</tr></table>"
             + "<table style='width:100%;border-collapse:collapse;margin-bottom:16px'>"
             + "<thead><tr style='background:#f8fafc'>"
             + "<th style='padding:8px;text-align:left;border-bottom:2px solid #e2e8f0'>Dịch vụ / Thuốc</th>"
             + "<th style='padding:8px;text-align:center;border-bottom:2px solid #e2e8f0'>SL</th>"
             + "<th style='padding:8px;text-align:right;border-bottom:2px solid #e2e8f0'>Đơn giá</th>"
             + "<th style='padding:8px;text-align:right;border-bottom:2px solid #e2e8f0'>Thành tiền</th>"
             + "</tr></thead><tbody>" + items + "</tbody></table>"
             + "<div style='text-align:right;padding:12px 0;border-top:2px solid #e2e8f0'>"
             + (hasDiscount
                    ? "<div style='color:#64748b;font-size:14px;margin-bottom:4px'>Tạm tính: " + vnd.format(inv.getSubTotal()) + "₫</div>"
                      + "<div style='color:#dc2626;font-size:14px;margin-bottom:6px'>Giảm giá: −" + vnd.format(inv.getDiscountAmount()) + "₫</div>"
                    : "")
             + "<span style='font-size:18px;font-weight:700;color:#10b981'>Tổng cộng: " + vnd.format(inv.getTotalAmount()) + "₫</span></div>"
             + "<p style='color:#64748b;font-size:13px'>Phương thức: " + ("CASH".equals(inv.getPaymentMethod()) ? "Tiền mặt" : "QR Code") + "</p>"
             + "</div>"
             + "<div style='background:#f8fafc;padding:16px 32px;text-align:center;color:#64748b;font-size:13px'>"
             + "Cảm ơn quý khách đã tin tưởng sử dụng dịch vụ của chúng tôi.</div></div>"
             + "</body></html>";
    }

    private static String nz(String s) {
        return s != null ? s : "";
    }
}
