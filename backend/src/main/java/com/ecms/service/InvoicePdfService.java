package com.ecms.service;

import com.ecms.dto.response.InvoiceResponse;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

/**
 * @author      ThangNB - HE201024
 * @contributor Đồng Mạnh Hùng - HE200743
 * @created     2026-06-23
 * @updated     2026-07-17
 *
 * Renders a printable invoice PDF with OpenPDF (UC-24 Deliver Invoice —
 * ALT-1 Receptionist print, ALT-2 patient download; Non-UI function
 * "Invoice PDF Generator").
 *
 * Returns raw {@code byte[]} so the controller can stream it straight back as
 * {@code application/pdf} without touching the filesystem.
 *
 * A Unicode-capable font is loaded explicitly because the default PDF base
 * fonts cannot render Vietnamese diacritics.
 */
@Service
public class InvoicePdfService {

    // ── Palette ───────────────────────────────────────────────────────────────────
    private static final Color C_PRIMARY    = new Color(67,  56,  202); // indigo-700
    private static final Color C_PRIMARY_LT = new Color(238, 242, 255); // indigo-50
    private static final Color C_SUCCESS    = new Color(5,   150, 105); // emerald-600
    private static final Color C_SUCCESS_LT = new Color(209, 250, 229); // emerald-100
    private static final Color C_MUTED      = new Color(100, 116, 139); // slate-500
    private static final Color C_DARK       = new Color(15,  23,  42);  // slate-900
    private static final Color C_BORDER     = new Color(203, 213, 225); // slate-300
    private static final Color C_ROW_ALT    = new Color(248, 250, 252); // slate-50
    private static final Color C_WHITE      = new Color(255, 255, 255);
    private static final Color C_HEADER_BG  = new Color(30,  27,  75);  // indigo-950
    private static final Color C_LABEL_BG   = new Color(241, 245, 249); // slate-100

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final NumberFormat VND_FMT =
            NumberFormat.getNumberInstance(new Locale("vi", "VN"));

    /**
     * Renders one invoice as an A4 PDF document.
     *
     * @param inv invoice with its charge lines populated; the totals shown are
     *            the stored ones, never recomputed here, so the printed
     *            document always matches what BR-11 produced at billing time
     * @return the PDF as a byte array
     * @throws RuntimeException if PDF generation fails
     */
    public byte[] generate(InvoiceResponse inv) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 36f, 36f, 36f, 36f);
            PdfWriter.getInstance(doc, out);
            doc.open();

            BaseFont bf = loadFont();

            // ── Fonts ──────────────────────────────────────────────────────────
            Font fClinicName = new Font(bf, 15, Font.BOLD,   C_WHITE);
            Font fClinicSub  = new Font(bf,  9, Font.NORMAL, new Color(196, 181, 253));
            Font fClinicInfo = new Font(bf,  8, Font.NORMAL, new Color(165, 180, 252));
            Font fTitle      = new Font(bf, 18, Font.BOLD,   C_PRIMARY);
            Font fCode       = new Font(bf,  9, Font.NORMAL, C_MUTED);
            Font fSecLbl     = new Font(bf,  8, Font.BOLD,   C_PRIMARY);
            Font fLabel      = new Font(bf,  9, Font.BOLD,   C_MUTED);
            Font fValue      = new Font(bf,  9, Font.NORMAL, C_DARK);
            Font fValueBold  = new Font(bf,  9, Font.BOLD,   C_DARK);
            Font fTh         = new Font(bf,  9, Font.BOLD,   C_WHITE);
            Font fTd         = new Font(bf,  9, Font.NORMAL, C_DARK);
            Font fTdSub      = new Font(bf,  8, Font.NORMAL, C_MUTED);
            Font fTotal      = new Font(bf, 13, Font.BOLD,   C_SUCCESS);
            Font fTotLbl     = new Font(bf, 10, Font.BOLD,   C_DARK);
            Font fFeeLabel   = new Font(bf,  9, Font.NORMAL, C_MUTED);
            Font fFeeValue   = new Font(bf,  9, Font.NORMAL, C_DARK);
            Font fBadge      = new Font(bf,  8, Font.BOLD,   C_WHITE);
            Font fFooter     = new Font(bf,  8, Font.ITALIC, C_MUTED);

            // ── 1. Header nền tối với tên phòng khám ──────────────────────────
            PdfPTable headerTbl = new PdfPTable(1);
            headerTbl.setWidthPercentage(100);
            headerTbl.setSpacingAfter(18f);

            PdfPCell hCell = new PdfPCell();
            hCell.setBackgroundColor(C_HEADER_BG);
            hCell.setPaddingTop(18f);
            hCell.setPaddingBottom(18f);
            hCell.setBorder(Rectangle.NO_BORDER);

            Paragraph pName = new Paragraph("NHÃN KHOA ÁNH SAO", fClinicName);
            pName.setAlignment(Element.ALIGN_CENTER);
            hCell.addElement(pName);

            Paragraph pSub = new Paragraph("Eyes Clinic Management System", fClinicSub);
            pSub.setAlignment(Element.ALIGN_CENTER);
            pSub.setSpacingBefore(3f);
            hCell.addElement(pSub);

            Paragraph pInfo = new Paragraph(
                    "Tel: 0909 123 456   |   Email: phongkham@anhsao.vn   |   anhsao.vn",
                    fClinicInfo);
            pInfo.setAlignment(Element.ALIGN_CENTER);
            pInfo.setSpacingBefore(5f);
            hCell.addElement(pInfo);

            headerTbl.addCell(hCell);
            doc.add(headerTbl);

            // ── 2. Tiêu đề hóa đơn + mã + badge trạng thái ───────────────────
            PdfPTable titleRow = new PdfPTable(new float[]{3.5f, 1f});
            titleRow.setWidthPercentage(100);
            titleRow.setSpacingAfter(14f);

            PdfPCell titleCell = new PdfPCell();
            titleCell.setBorder(Rectangle.NO_BORDER);
            Paragraph titleP = new Paragraph("HÓA ĐƠN DỊCH VỤ Y TẾ", fTitle);
            titleCell.addElement(titleP);
            Paragraph codeP = new Paragraph("Mã hóa đơn: " + safe(inv.getInvoiceCode()), fCode);
            codeP.setSpacingBefore(3f);
            titleCell.addElement(codeP);
            titleRow.addCell(titleCell);

            String sLabel = "DRAFT".equals(inv.getStatus())     ? "NHÁP"
                    : "CANCELLED".equals(inv.getStatus())       ? "ĐÃ HỦY"
                    : "ĐÃ PHÁT HÀNH";
            Color sBg = "DRAFT".equals(inv.getStatus())         ? new Color(161, 98,   7)
                    : "CANCELLED".equals(inv.getStatus())       ? new Color(185, 28,  28)
                    : C_SUCCESS;
            PdfPCell badgeCell = new PdfPCell(new Phrase(sLabel, fBadge));
            badgeCell.setBackgroundColor(sBg);
            badgeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            badgeCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            badgeCell.setPadding(8f);
            badgeCell.setBorder(Rectangle.NO_BORDER);
            titleRow.addCell(badgeCell);
            doc.add(titleRow);

            // ── 3. Grid thông tin: bệnh nhân (trái) | hóa đơn (phải) ──────────
            // 5 cột: [label1 | value1 | khoảng trắng mỏng | label2 | value2]
            PdfPTable info = new PdfPTable(new float[]{1.5f, 2.5f, 0.08f, 1.5f, 2.5f});
            info.setWidthPercentage(100);
            info.setSpacingAfter(16f);

            infoSecHdr(info, "THÔNG TIN BỆNH NHÂN", fSecLbl, C_PRIMARY_LT, C_PRIMARY, 2);
            spacerCell(info);
            infoSecHdr(info, "THÔNG TIN HÓA ĐƠN",   fSecLbl, C_PRIMARY_LT, C_PRIMARY, 2);

            infoRow4(info,
                    "Họ tên:",       safe(inv.getPatientName()),  fLabel, fValueBold,
                    "Bác sĩ:",       safe(inv.getDoctorName()),   fLabel, fValue);
            infoRow4(info,
                    "Mã bệnh nhân:", safe(inv.getPatientCode()),  fLabel, fValue,
                    "Dịch vụ:",      safe(inv.getServiceName()),  fLabel, fValue);
            infoRow4(info,
                    "SĐT:",          safe(inv.getPatientPhone()), fLabel, fValue,
                    "Giờ khám:",     inv.getTimeSlot() != null ? inv.getTimeSlot() : "-", fLabel, fValue);
            infoRow4(info,
                    "Email:",        safe(inv.getPatientEmail()), fLabel, fValue,
                    "Ngày TT:",      inv.getPaidAt() != null
                            ? inv.getPaidAt().format(DATE_FMT) : "Chưa thanh toán", fLabel, fValue);
            doc.add(info);

            // ── 4. Bảng khoản phí với header màu + hàng xen kẽ ───────────────
            PdfPTable tbl = new PdfPTable(new float[]{0.5f, 4.2f, 0.7f, 1.9f, 1.9f});
            tbl.setWidthPercentage(100);
            tbl.setSpacingAfter(4f);

            String[] thTexts  = {"STT", "Dịch vụ / Thuốc / Vật tư", "SL", "Đơn giá", "Thành tiền"};
            int[]    thAligns = {Element.ALIGN_CENTER, Element.ALIGN_LEFT, Element.ALIGN_CENTER,
                    Element.ALIGN_RIGHT, Element.ALIGN_RIGHT};
            for (int i = 0; i < thTexts.length; i++) {
                PdfPCell c = new PdfPCell(new Phrase(thTexts[i], fTh));
                c.setBackgroundColor(C_PRIMARY);
                c.setHorizontalAlignment(thAligns[i]);
                c.setPaddingTop(9f);  c.setPaddingBottom(9f);
                c.setPaddingLeft(6f); c.setPaddingRight(6f);
                c.setBorder(Rectangle.NO_BORDER);
                tbl.addCell(c);
            }

            List<InvoiceResponse.InvoiceItemResponse> items = inv.getItems();
            if (items != null) {
                for (int i = 0; i < items.size(); i++) {
                    InvoiceResponse.InvoiceItemResponse it = items.get(i);
                    Color bg = (i % 2 == 1) ? C_ROW_ALT : C_WHITE;
                    td(tbl, String.valueOf(i + 1),      Element.ALIGN_CENTER, fTdSub, bg);
                    td(tbl, safe(it.getDescription()),   Element.ALIGN_LEFT,   fTd,    bg);
                    td(tbl, String.valueOf(it.getQuantity() != null ? it.getQuantity() : 1),
                            Element.ALIGN_CENTER, fTd, bg);
                    td(tbl, fmtVnd(it.getUnitPrice()),  Element.ALIGN_RIGHT,  fTd,    bg);
                    td(tbl, fmtVnd(it.getSubtotal()),   Element.ALIGN_RIGHT,  fTd,    bg);
                }
            }
            doc.add(tbl);

            // ── 5. Phương thức thanh toán ─────────────────────────────────────
            String payLabel = "CASH".equals(inv.getPaymentMethod())   ? "Tiền mặt"
                    : "VIET_QR".equals(inv.getPaymentMethod())        ? "QR Code (VietQR)" : "-";
            Paragraph payP = new Paragraph();
            payP.add(new Chunk("Phương thức thanh toán: ", fLabel));
            payP.add(new Chunk(payLabel, fValue));
            payP.setSpacingBefore(8f);
            doc.add(payP);

            if (inv.getPaymentReference() != null && !inv.getPaymentReference().isBlank()) {
                Paragraph refP = new Paragraph();
                refP.add(new Chunk("Mã tham chiếu: ", fLabel));
                refP.add(new Chunk(inv.getPaymentReference(), fValue));
                refP.setSpacingBefore(4f);
                doc.add(refP);
            }

            // ── 6. Bảng tổng tiền căn phải, dòng tổng có nền xanh ────────────
            boolean hasFees = isPos(inv.getServiceFee())
                           || isPos(inv.getLabFee())
                           || isPos(inv.getMedicineFee());

            PdfPTable sumTbl = new PdfPTable(new float[]{2.4f, 1.8f});
            sumTbl.setWidthPercentage(42);
            sumTbl.setHorizontalAlignment(Element.ALIGN_RIGHT);
            sumTbl.setSpacingBefore(10f);
            sumTbl.setSpacingAfter(16f);

            if (hasFees) {
                if (isPos(inv.getServiceFee()))
                    feeRow(sumTbl, "Phí khám dịch vụ:", fmtVnd(inv.getServiceFee()), fFeeLabel, fFeeValue);
                if (isPos(inv.getLabFee()))
                    feeRow(sumTbl, "Phí xét nghiệm:", fmtVnd(inv.getLabFee()), fFeeLabel, fFeeValue);
                if (isPos(inv.getMedicineFee()))
                    feeRow(sumTbl, "Phí thuốc / kính:", fmtVnd(inv.getMedicineFee()), fFeeLabel, fFeeValue);
            }

            // Dòng giảm giá (BR-11): chỉ hiển thị khi có áp dụng discount
            if (isPos(inv.getDiscountAmount())) {
                feeRow(sumTbl, "Tạm tính:", fmtVnd(inv.getSubTotal()), fFeeLabel, fFeeValue);
                feeRow(sumTbl, "Giảm giá:", "-" + fmtVnd(inv.getDiscountAmount()), fFeeLabel, fFeeValue);
            }

            PdfPCell tc1 = new PdfPCell(new Phrase("TỔNG CỘNG:", fTotLbl));
            tc1.setBackgroundColor(C_SUCCESS_LT);
            tc1.setHorizontalAlignment(Element.ALIGN_RIGHT);
            tc1.setPadding(9f);
            tc1.setBorderWidthTop(1.5f);  tc1.setBorderColorTop(C_SUCCESS);
            tc1.setBorderWidthBottom(0f); tc1.setBorderWidthLeft(0f); tc1.setBorderWidthRight(0f);
            sumTbl.addCell(tc1);

            PdfPCell tc2 = new PdfPCell(new Phrase(fmtVnd(inv.getTotalAmount()), fTotal));
            tc2.setBackgroundColor(C_SUCCESS_LT);
            tc2.setHorizontalAlignment(Element.ALIGN_RIGHT);
            tc2.setPadding(9f);
            tc2.setBorderWidthTop(1.5f);  tc2.setBorderColorTop(C_SUCCESS);
            tc2.setBorderWidthBottom(0f); tc2.setBorderWidthLeft(0f); tc2.setBorderWidthRight(0f);
            sumTbl.addCell(tc2);

            doc.add(sumTbl);

            // ── 7. Footer với đường kẻ ngang ─────────────────────────────────
            PdfPTable line = new PdfPTable(1);
            line.setWidthPercentage(100);
            line.setSpacingAfter(8f);
            PdfPCell lineC = new PdfPCell();
            lineC.setFixedHeight(1f);
            lineC.setBackgroundColor(C_BORDER);
            lineC.setBorder(Rectangle.NO_BORDER);
            line.addCell(lineC);
            doc.add(line);

            Paragraph footer = new Paragraph(
                    "Cảm ơn quý khách đã sử dụng dịch vụ của Nhãn Khoa Ánh Sao.\n" +
                    "Mọi thắc mắc, xin liên hệ: 0909 123 456  |  phongkham@anhsao.vn",
                    fFooter);
            footer.setAlignment(Element.ALIGN_CENTER);
            doc.add(footer);

            doc.close();
            return out.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Không thể tạo PDF: " + e.getMessage(), e);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    /** Section heading inside the info table: tinted background, primary bottom rule. */
    private void infoSecHdr(PdfPTable t, String text, Font f,
                             Color bg, Color borderC, int span) {
        PdfPCell c = new PdfPCell(new Phrase(text, f));
        c.setBackgroundColor(bg);
        c.setColspan(span);
        c.setPadding(6f);
        c.setBorderWidthTop(0f); c.setBorderWidthLeft(0f); c.setBorderWidthRight(0f);
        c.setBorderWidthBottom(1.5f); c.setBorderColorBottom(borderC);
        t.addCell(c);
    }

    /** Blank spacer cell separating the two info columns. */
    private void spacerCell(PdfPTable t) {
        PdfPCell c = new PdfPCell();
        c.setBorder(Rectangle.NO_BORDER);
        t.addCell(c);
    }

    /** Appends one 5-cell row (label1, value1, spacer, label2, value2) to the info table. */
    private void infoRow4(PdfPTable t,
                           String l1, String v1, Font fl1, Font fv1,
                           String l2, String v2, Font fl2, Font fv2) {
        t.addCell(labelCell(l1, fl1));
        t.addCell(valueCell(v1, fv1));
        spacerCell(t);
        t.addCell(labelCell(l2, fl2));
        t.addCell(valueCell(v2, fv2));
    }

    /** Label cell on a light grey background. */
    private PdfPCell labelCell(String text, Font f) {
        PdfPCell c = new PdfPCell(new Phrase(text, f));
        c.setBackgroundColor(C_LABEL_BG);
        c.setBorder(Rectangle.NO_BORDER);
        c.setPaddingTop(5f);    c.setPaddingBottom(5f);
        c.setPaddingLeft(6f);   c.setPaddingRight(4f);
        return c;
    }

    /** Borderless value cell. */
    private PdfPCell valueCell(String text, Font f) {
        PdfPCell c = new PdfPCell(new Phrase(text, f));
        c.setBorder(Rectangle.NO_BORDER);
        c.setPaddingTop(5f);    c.setPaddingBottom(5f);
        c.setPaddingLeft(4f);   c.setPaddingRight(6f);
        return c;
    }

    /** Data cell of the charge-line table: hairline border, alternating row tint. */
    private void td(PdfPTable t, String text, int align, Font f, Color bg) {
        PdfPCell c = new PdfPCell(new Phrase(text, f));
        c.setHorizontalAlignment(align);
        c.setPaddingTop(7f);    c.setPaddingBottom(7f);
        c.setPaddingLeft(6f);   c.setPaddingRight(6f);
        c.setBackgroundColor(bg);
        c.setBorderColor(C_BORDER);
        c.setBorderWidth(0.3f);
        t.addCell(c);
    }

    /** Right-aligned, borderless row of the totals block (BR-11 breakdown). */
    private void feeRow(PdfPTable t, String label, String value, Font fl, Font fv) {
        PdfPCell lc = new PdfPCell(new Phrase(label, fl));
        lc.setHorizontalAlignment(Element.ALIGN_RIGHT);
        lc.setBorder(Rectangle.NO_BORDER);
        lc.setPaddingTop(4f); lc.setPaddingBottom(4f);
        t.addCell(lc);

        PdfPCell vc = new PdfPCell(new Phrase(value, fv));
        vc.setHorizontalAlignment(Element.ALIGN_RIGHT);
        vc.setBorder(Rectangle.NO_BORDER);
        vc.setPaddingTop(4f); vc.setPaddingBottom(4f);
        t.addCell(vc);
    }

    /**
     * Loads a font that actually carries Vietnamese glyphs, so the printed
     * invoice keeps its diacritics.
     *
     * IDENTITY_H (Unicode) plus font embedding is mandatory: without both,
     * characters such as "ế", "ộ" or "đ" degrade to boxes or question marks on
     * any machine that does not have the font installed locally.
     *
     * Fallback order:
     *  1. Roboto bundled in resources — works on every OS including the Linux
     *     deployment target, which is why the font is committed to the repo
     *     rather than relying on a system font (OFL, see fonts/LICENSE-Roboto-OFL.txt).
     *  2. Windows Arial — only covers the case where the bundled font was deleted.
     *  3. Helvetica — has NO Vietnamese glyphs. Reaching this branch means the
     *     invoice will print mangled text, so it warns loudly instead of
     *     silently emitting a broken document.
     *
     * @return an embedded Unicode base font, or the Helvetica last resort
     * @throws Exception if even the fallback font cannot be created
     */
    private BaseFont loadFont() throws Exception {
        try (var stream = getClass().getResourceAsStream("/fonts/Roboto.ttf")) {
            if (stream != null) {
                byte[] bytes = stream.readAllBytes();
                return BaseFont.createFont("Roboto.ttf", BaseFont.IDENTITY_H,
                        BaseFont.EMBEDDED, true, bytes, null);
            }
        } catch (Exception ignored) {}
        try {
            return BaseFont.createFont("C:/Windows/Fonts/arial.ttf",
                    BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
        } catch (Exception ignored) {}
        System.err.println("[InvoicePdfService] CẢNH BÁO: không nạp được font Unicode "
                + "(/fonts/Roboto.ttf); hóa đơn PDF sẽ mất dấu tiếng Việt.");
        return BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252,
                BaseFont.NOT_EMBEDDED);
    }

    /**
     * Formats an amount as Vietnamese currency, e.g. "1.250.000 đ".
     *
     * @param v amount; null renders as "0 đ" so the PDF never prints "null"
     * @return the formatted amount
     */
    private String fmtVnd(BigDecimal v) {
        if (v == null) return "0 đ";
        return VND_FMT.format(v.longValue()) + " đ";
    }

    /**
     * Whether an amount is strictly positive — decides whether the optional
     * discount row is rendered at all (BR-11: a zero discount is not printed).
     *
     * @param v amount, may be null
     * @return true when v is non-null and greater than zero
     */
    private boolean isPos(BigDecimal v) {
        return v != null && v.compareTo(BigDecimal.ZERO) > 0;
    }

    /**
     * Null-safe text for the PDF: an absent optional field prints as a dash
     * rather than the literal "null".
     *
     * @param s value that may be null
     * @return {@code s}, or "-"
     */
    private String safe(String s) {
        return s != null ? s : "-";
    }
}

