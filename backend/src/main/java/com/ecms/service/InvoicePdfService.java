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

// ThangNBHE201024
// Service tạo file PDF hóa đơn khám bệnh bằng thư viện OpenPDF.
// Xuất byte[] để controller trả về HTTP response với Content-Type: application/pdf.
@Service
public class InvoicePdfService {

    // ── Bảng màu ──────────────────────────────────────────────────────────────────
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

            Paragraph pName = new Paragraph("NHAN KHOA ANH SAO", fClinicName);
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
            Paragraph titleP = new Paragraph("HOA DON DICH VU Y TE", fTitle);
            titleCell.addElement(titleP);
            Paragraph codeP = new Paragraph("Ma hoa don: " + safe(inv.getInvoiceCode()), fCode);
            codeP.setSpacingBefore(3f);
            titleCell.addElement(codeP);
            titleRow.addCell(titleCell);

            String sLabel = "DRAFT".equals(inv.getStatus())     ? "NHAP"
                    : "CANCELLED".equals(inv.getStatus())       ? "DA HUY"
                    : "DA PHAT HANH";
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

            infoSecHdr(info, "THONG TIN BENH NHAN", fSecLbl, C_PRIMARY_LT, C_PRIMARY, 2);
            spacerCell(info);
            infoSecHdr(info, "THONG TIN HOA DON",   fSecLbl, C_PRIMARY_LT, C_PRIMARY, 2);

            infoRow4(info,
                    "Ho ten:",       safe(inv.getPatientName()),  fLabel, fValueBold,
                    "Bac si:",       safe(inv.getDoctorName()),   fLabel, fValue);
            infoRow4(info,
                    "Ma benh nhan:", safe(inv.getPatientCode()),  fLabel, fValue,
                    "Dich vu:",      safe(inv.getServiceName()),  fLabel, fValue);
            infoRow4(info,
                    "SDT:",          safe(inv.getPatientPhone()), fLabel, fValue,
                    "Gio kham:",     inv.getTimeSlot() != null ? inv.getTimeSlot() : "-", fLabel, fValue);
            infoRow4(info,
                    "Email:",        safe(inv.getPatientEmail()), fLabel, fValue,
                    "Ngay TT:",      inv.getPaidAt() != null
                            ? inv.getPaidAt().format(DATE_FMT) : "Chua thanh toan", fLabel, fValue);
            doc.add(info);

            // ── 4. Bảng khoản phí với header màu + hàng xen kẽ ───────────────
            PdfPTable tbl = new PdfPTable(new float[]{0.5f, 4.2f, 0.7f, 1.9f, 1.9f});
            tbl.setWidthPercentage(100);
            tbl.setSpacingAfter(4f);

            String[] thTexts  = {"STT", "Dich vu / Thuoc / Vat tu", "SL", "Don gia", "Thanh tien"};
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
            String payLabel = "CASH".equals(inv.getPaymentMethod())   ? "Tien mat"
                    : "VIET_QR".equals(inv.getPaymentMethod())        ? "QR Code (VietQR)" : "-";
            Paragraph payP = new Paragraph();
            payP.add(new Chunk("Phuong thuc thanh toan: ", fLabel));
            payP.add(new Chunk(payLabel, fValue));
            payP.setSpacingBefore(8f);
            doc.add(payP);

            if (inv.getPaymentReference() != null && !inv.getPaymentReference().isBlank()) {
                Paragraph refP = new Paragraph();
                refP.add(new Chunk("Ma tham chieu: ", fLabel));
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
                    feeRow(sumTbl, "Phi kham dich vu:", fmtVnd(inv.getServiceFee()), fFeeLabel, fFeeValue);
                if (isPos(inv.getLabFee()))
                    feeRow(sumTbl, "Phi xet nghiem:", fmtVnd(inv.getLabFee()), fFeeLabel, fFeeValue);
                if (isPos(inv.getMedicineFee()))
                    feeRow(sumTbl, "Phi thuoc / kinh:", fmtVnd(inv.getMedicineFee()), fFeeLabel, fFeeValue);
            }

            PdfPCell tc1 = new PdfPCell(new Phrase("TONG CONG:", fTotLbl));
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
                    "Cam on quy khach da su dung dich vu cua Nhan Khoa Anh Sao.\n" +
                    "Moi thac mac, xin lien he: 0909 123 456  |  phongkham@anhsao.vn",
                    fFooter);
            footer.setAlignment(Element.ALIGN_CENTER);
            doc.add(footer);

            doc.close();
            return out.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Khong the tao PDF: " + e.getMessage(), e);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    // Tiêu đề section trong bảng thông tin (nền nhạt, viền dưới màu primary)
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

    // Ô trống ngăn cách hai section trong bảng info
    private void spacerCell(PdfPTable t) {
        PdfPCell c = new PdfPCell();
        c.setBorder(Rectangle.NO_BORDER);
        t.addCell(c);
    }

    // Thêm một hàng gồm 5 ô (label1-value1-spacer-label2-value2) vào bảng 5 cột
    private void infoRow4(PdfPTable t,
                           String l1, String v1, Font fl1, Font fv1,
                           String l2, String v2, Font fl2, Font fv2) {
        t.addCell(labelCell(l1, fl1));
        t.addCell(valueCell(v1, fv1));
        spacerCell(t);
        t.addCell(labelCell(l2, fl2));
        t.addCell(valueCell(v2, fv2));
    }

    // Ô nhãn với nền slate-100
    private PdfPCell labelCell(String text, Font f) {
        PdfPCell c = new PdfPCell(new Phrase(text, f));
        c.setBackgroundColor(C_LABEL_BG);
        c.setBorder(Rectangle.NO_BORDER);
        c.setPaddingTop(5f);    c.setPaddingBottom(5f);
        c.setPaddingLeft(6f);   c.setPaddingRight(4f);
        return c;
    }

    // Ô giá trị không viền
    private PdfPCell valueCell(String text, Font f) {
        PdfPCell c = new PdfPCell(new Phrase(text, f));
        c.setBorder(Rectangle.NO_BORDER);
        c.setPaddingTop(5f);    c.setPaddingBottom(5f);
        c.setPaddingLeft(4f);   c.setPaddingRight(6f);
        return c;
    }

    // Ô dữ liệu trong bảng items (viền mỏng, nền xen kẽ trắng/slate-50)
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

    // Hàng phí trong bảng tổng (căn phải, không viền)
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

    // Tải font Arial; fallback về Helvetica nếu không tìm thấy
    private BaseFont loadFont() throws Exception {
        try (var stream = getClass().getResourceAsStream("/fonts/arial.ttf")) {
            if (stream != null) {
                byte[] bytes = stream.readAllBytes();
                return BaseFont.createFont("arial.ttf", BaseFont.IDENTITY_H,
                        true, true, bytes, null);
            }
        } catch (Exception ignored) {}
        try {
            return BaseFont.createFont("C:/Windows/Fonts/arial.ttf",
                    BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
        } catch (Exception ignored) {}
        return BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252,
                BaseFont.NOT_EMBEDDED);
    }

    private String fmtVnd(BigDecimal v) {
        if (v == null) return "0 d";
        return VND_FMT.format(v.longValue()) + " d";
    }

    private boolean isPos(BigDecimal v) {
        return v != null && v.compareTo(BigDecimal.ZERO) > 0;
    }

    private String safe(String s) {
        return s != null ? s : "-";
    }
}
