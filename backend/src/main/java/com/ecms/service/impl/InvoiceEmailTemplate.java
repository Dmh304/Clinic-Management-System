package com.ecms.service.impl;

import com.ecms.dto.response.InvoiceResponse;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * @author  ThangNB - HE201024
 * @created 2026-07-11
 * @updated 2026-07-26
 *
 * Builds the HTML bodies of the two billing emails from an
 * {@link InvoiceResponse} (UC-24 Deliver Invoice).
 *
 * The two are deliberately separate documents, not one template with a status
 * label, because they serve opposite purposes:
 *
 *   - {@link #buildPaymentReminder} — the invoice is NOT settled yet. It asks
 *     the patient to pay and carries the transfer instructions. No PDF is
 *     attached: under BR-10 the invoice is still DRAFT/UNPAID, so there is no
 *     issued document to send.
 *   - {@link #buildPaidInvoice} — the invoice IS settled. It is the receipt,
 *     and the caller attaches the invoice PDF to it (UC-24 POST-1).
 *
 * Kept out of {@code InvoiceServiceImpl} so the background mailer
 * ({@code InvoiceMailDispatcher}) can render from an already-loaded DTO with
 * no entity or transaction attached — nothing here can trigger a lazy load on
 * a detached session.
 */
final class InvoiceEmailTemplate {

    private static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    // Palette kept in sync with the invoice PDF so the two documents match.
    private static final String C_PAID    = "#059669"; // emerald — settled
    private static final String C_DUE     = "#b45309"; // amber   — action required
    private static final String C_INK     = "#1e293b";
    private static final String C_MUTED   = "#64748b";
    private static final String C_LINE    = "#e2e8f0";

    /** Utility class — never instantiated. */
    private InvoiceEmailTemplate() {
    }

    /**
     * Receipt email for a settled invoice (UC-24 normal flow).
     *
     * The caller attaches the invoice PDF, so this body summarises the charges
     * and points at the attachment rather than repeating every legal detail.
     *
     * @param inv invoice with {@code paymentStatus = PAID} and its charge lines
     * @return HTML body
     */
    static String buildPaidInvoice(InvoiceResponse inv) {
        NumberFormat vnd = vnd();

        String meta = "<table style='width:100%;margin-bottom:16px;font-size:14px'><tr>"
                + "<td><strong>Bệnh nhân:</strong> " + nz(inv.getPatientName()) + "<br>"
                + "<strong>SĐT:</strong> " + nz(inv.getPatientPhone()) + "</td>"
                + "<td style='text-align:right'><strong>Bác sĩ:</strong> " + dash(inv.getDoctorName()) + "<br>"
                + "<strong>Ngày thanh toán:</strong> "
                + (inv.getPaidAt() != null ? inv.getPaidAt().format(DTF) : "—") + "</td>"
                + "</tr></table>";

        String body = meta
                + itemsTable(inv, vnd)
                + totals(inv, vnd, C_PAID, "Tổng cộng")
                + "<p style='color:" + C_MUTED + ";font-size:13px;margin:12px 0 0'>Phương thức thanh toán: "
                + methodLabel(inv.getPaymentMethod()) + "</p>"
                + "<div style='margin-top:18px;padding:12px 14px;background:#ecfdf5;border-left:3px solid " + C_PAID + ";font-size:13px'>"
                + "Hóa đơn chi tiết được gửi kèm theo email này dưới dạng tệp PDF."
                + "</div>";

        return shell(C_PAID, "Hóa đơn đã thanh toán", "Mã hóa đơn: <strong>"
                + nz(inv.getInvoiceCode()) + "</strong>", body,
                "Cảm ơn quý khách đã tin tưởng sử dụng dịch vụ của chúng tôi.");
    }

    /**
     * Payment reminder for an invoice that has not been settled yet
     * (UC-23 step 3 — "the Patient is notified to pay").
     *
     * For a VietQR invoice the transfer memo MUST be the invoice code: that is
     * the only thing the payment webhook can match on, so a patient who omits
     * it produces an UNMATCHED transaction needing manual reconciliation.
     * The memo is therefore stated explicitly and set apart from the prose.
     *
     * @param inv         invoice that is UNPAID or PENDING_PAYMENT
     * @param bankName    receiving bank display name, may be null
     * @param bankAccount receiving account number, may be null
     * @param bankHolder  account holder name, may be null
     * @return HTML body
     */
    static String buildPaymentReminder(InvoiceResponse inv, String bankName,
                                       String bankAccount, String bankHolder) {
        NumberFormat vnd = vnd();
        boolean byTransfer = !"CASH".equals(inv.getPaymentMethod());

        String due = "<div style='text-align:center;padding:18px 0 6px'>"
                + "<div style='font-size:13px;color:" + C_MUTED + "'>Số tiền cần thanh toán</div>"
                + "<div style='font-size:30px;font-weight:700;color:" + C_DUE + ";margin-top:4px'>"
                + vnd.format(nzAmount(inv.getTotalAmount())) + "₫</div></div>";

        String how;
        if (byTransfer) {
            how = "<div style='margin-top:18px;padding:14px 16px;background:#fffbeb;border-left:3px solid " + C_DUE + "'>"
                + "<div style='font-weight:700;font-size:14px;margin-bottom:8px'>Chuyển khoản</div>"
                + "<table style='font-size:13.5px;line-height:1.8'>"
                + row("Ngân hàng", dash(bankName))
                + row("Số tài khoản", dash(bankAccount))
                + row("Chủ tài khoản", dash(bankHolder))
                + "<tr><td style='padding-right:12px;color:" + C_MUTED + "'>Nội dung CK</td>"
                + "<td><strong style='font-family:monospace;font-size:14px'>"
                + nz(inv.getInvoiceCode()) + "</strong></td></tr>"
                + "</table>"
                + "<p style='margin:10px 0 0;font-size:13px;color:" + C_MUTED + "'>"
                + "Vui lòng ghi <strong>đúng</strong> nội dung chuyển khoản ở trên. Hệ thống dựa vào nội dung này "
                + "để tự động xác nhận thanh toán cho hóa đơn của quý khách."
                + "</p></div>";
        } else {
            how = "<div style='margin-top:18px;padding:14px 16px;background:#fffbeb;border-left:3px solid " + C_DUE + "'>"
                + "<div style='font-weight:700;font-size:14px;margin-bottom:6px'>Thanh toán tại quầy</div>"
                + "<p style='margin:0;font-size:13.5px;color:" + C_MUTED + "'>"
                + "Quý khách vui lòng thanh toán bằng tiền mặt tại quầy lễ tân. "
                + "Nhân viên sẽ xác nhận và hóa đơn sẽ được gửi lại qua email ngay sau đó.</p></div>";
        }

        String body = "<p style='margin:0 0 4px;font-size:14px'>Kính gửi <strong>"
                + nz(inv.getPatientName()) + "</strong>,</p>"
                + "<p style='margin:0;font-size:14px;color:" + C_MUTED + "'>"
                + "Phòng khám xin thông báo hóa đơn cho lần khám của quý khách đã được lập.</p>"
                + due
                + itemsTable(inv, vnd)
                + totals(inv, vnd, C_DUE, "Cần thanh toán")
                + how;

        return shell(C_DUE, "Thông báo thanh toán", "Mã hóa đơn: <strong>"
                + nz(inv.getInvoiceCode()) + "</strong>", body,
                "Hóa đơn PDF sẽ được gửi tới quý khách sau khi thanh toán hoàn tất.");
    }

    // ── shared building blocks ────────────────────────────────────────────────

    /**
     * Wraps a body in the shared email frame.
     * Every style is inlined because most mail clients strip {@code <style>}.
     *
     * @param accent   header background, encodes paid vs due
     * @param title    header title
     * @param subtitle header subtitle, may contain HTML
     * @param body     the already-rendered body HTML
     * @param footer   footer sentence
     * @return the complete HTML document
     */
    private static String shell(String accent, String title, String subtitle,
                                String body, String footer) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head>"
             + "<body style='font-family:Arial,sans-serif;color:" + C_INK + ";margin:0;padding:0'>"
             + "<div style='max-width:600px;margin:24px auto;border:1px solid " + C_LINE + ";border-radius:8px;overflow:hidden'>"
             + "<div style='background:" + accent + ";color:#fff;padding:24px 32px'>"
             + "<h2 style='margin:0;font-size:20px'>" + title + "</h2>"
             + "<p style='margin:4px 0 0;opacity:.85'>" + subtitle + "</p></div>"
             + "<div style='padding:24px 32px'>" + body + "</div>"
             + "<div style='background:#f8fafc;padding:16px 32px;text-align:center;color:" + C_MUTED + ";font-size:13px'>"
             + footer + "</div></div></body></html>";
    }

    /**
     * Renders the charge lines table. Shared by both emails so the patient sees
     * the same itemisation before and after paying.
     *
     * @param inv invoice whose {@code items} are rendered; empty list is tolerated
     * @param vnd currency formatter
     * @return the table HTML
     */
    private static String itemsTable(InvoiceResponse inv, NumberFormat vnd) {
        StringBuilder rows = new StringBuilder();
        if (inv.getItems() != null) {
            for (InvoiceResponse.InvoiceItemResponse it : inv.getItems()) {
                String cell = "padding:6px 8px;border-bottom:1px solid " + C_LINE;
                rows.append("<tr>")
                    .append("<td style='").append(cell).append("'>").append(nz(it.getDescription())).append("</td>")
                    .append("<td style='").append(cell).append(";text-align:center'>").append(it.getQuantity()).append("</td>")
                    .append("<td style='").append(cell).append(";text-align:right'>").append(vnd.format(nzAmount(it.getUnitPrice()))).append("₫</td>")
                    .append("<td style='").append(cell).append(";text-align:right'>").append(vnd.format(nzAmount(it.getSubtotal()))).append("₫</td>")
                    .append("</tr>");
            }
        }
        String th = "padding:8px;border-bottom:2px solid " + C_LINE;
        return "<table style='width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13.5px'>"
             + "<thead><tr style='background:#f8fafc'>"
             + "<th style='" + th + ";text-align:left'>Dịch vụ / Thuốc</th>"
             + "<th style='" + th + ";text-align:center'>SL</th>"
             + "<th style='" + th + ";text-align:right'>Đơn giá</th>"
             + "<th style='" + th + ";text-align:right'>Thành tiền</th>"
             + "</tr></thead><tbody>" + rows + "</tbody></table>";
    }

    /**
     * Renders the totals block per BR-11 (subtotal − discount = total).
     * The subtotal and discount lines only appear when a discount was actually
     * granted, so an undiscounted invoice is not padded with a "−0₫" row.
     *
     * @param inv    invoice
     * @param vnd    currency formatter
     * @param accent colour for the grand total
     * @param label  wording for the grand total, differs per email
     * @return the totals HTML
     */
    private static String totals(InvoiceResponse inv, NumberFormat vnd, String accent, String label) {
        boolean hasDiscount = inv.getDiscountAmount() != null
                && inv.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0;
        return "<div style='text-align:right;padding:12px 0;border-top:2px solid " + C_LINE + "'>"
             + (hasDiscount
                    ? "<div style='color:" + C_MUTED + ";font-size:14px;margin-bottom:4px'>Tạm tính: "
                      + vnd.format(nzAmount(inv.getSubTotal())) + "₫</div>"
                      + "<div style='color:#dc2626;font-size:14px;margin-bottom:6px'>Giảm giá: −"
                      + vnd.format(nzAmount(inv.getDiscountAmount())) + "₫</div>"
                    : "")
             + "<span style='font-size:18px;font-weight:700;color:" + accent + "'>" + label + ": "
             + vnd.format(nzAmount(inv.getTotalAmount())) + "₫</span></div>";
    }

    /** One label/value row of the bank details table. */
    private static String row(String label, String value) {
        return "<tr><td style='padding-right:12px;color:" + C_MUTED + "'>" + label + "</td>"
             + "<td><strong>" + value + "</strong></td></tr>";
    }

    /** Vietnamese number formatter, built per call since NumberFormat is not thread-safe. */
    private static NumberFormat vnd() {
        return NumberFormat.getInstance(new Locale("vi", "VN"));
    }

    /** Human label for the payment channel (UC-23 ALT-1 / ALT-2). */
    private static String methodLabel(String method) {
        return "CASH".equals(method) ? "Tiền mặt" : "Chuyển khoản QR (VietQR)";
    }

    /**
     * Null-safe amount, so a missing figure renders as 0 instead of crashing
     * the formatter mid-email.
     *
     * @param v amount, may be null
     * @return {@code v}, or {@code BigDecimal.ZERO}
     */
    private static BigDecimal nzAmount(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    /**
     * Null-safe string for templating — keeps a missing optional field from
     * printing the literal "null" in the customer-facing email.
     *
     * @param s value that may be null
     * @return {@code s}, or an empty string
     */
    private static String nz(String s) {
        return s != null ? s : "";
    }

    /** Like {@link #nz} but renders an em dash, for labelled fields. */
    private static String dash(String s) {
        return (s != null && !s.isBlank()) ? s : "—";
    }
}
