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

@Service
public class InvoicePdfService {

    private static final Color COLOR_PRIMARY    = new Color(79,  70,  229);
    private static final Color COLOR_SUCCESS    = new Color(16,  185, 129);
    private static final Color COLOR_MUTED      = new Color(100, 116, 139);
    private static final Color COLOR_HEADER_BG  = new Color(248, 250, 252);
    private static final Color COLOR_BORDER     = new Color(226, 232, 240);
    private static final Color COLOR_DARK       = new Color(30,  41,  59);

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final NumberFormat VND_FMT =
            NumberFormat.getNumberInstance(new Locale("vi", "VN"));

    public byte[] generate(InvoiceResponse inv) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 40f, 40f, 55f, 40f);
            PdfWriter.getInstance(doc, out);
            doc.open();

            BaseFont bf = loadFont();
            Font fClinic  = new Font(bf, 14, Font.BOLD,   COLOR_DARK);
            Font fSub     = new Font(bf,  9, Font.NORMAL, COLOR_MUTED);
            Font fTitle   = new Font(bf, 18, Font.BOLD,   COLOR_PRIMARY);
            Font fCode    = new Font(bf, 10, Font.NORMAL, COLOR_MUTED);
            Font fLabel   = new Font(bf, 10, Font.BOLD,   COLOR_DARK);
            Font fValue   = new Font(bf, 10, Font.NORMAL, COLOR_DARK);
            Font fSmall   = new Font(bf,  8, Font.NORMAL, COLOR_MUTED);
            Font fTh      = new Font(bf,  9, Font.BOLD,   COLOR_DARK);
            Font fTd      = new Font(bf,  9, Font.NORMAL, COLOR_DARK);
            Font fTotal   = new Font(bf, 13, Font.BOLD,   COLOR_SUCCESS);
            Font fTotLbl  = new Font(bf, 12, Font.BOLD,   COLOR_DARK);
            Font fFooter  = new Font(bf,  9, Font.ITALIC, COLOR_MUTED);

            // ── Clinic header ─────────────────────────────────────────────
            Paragraph clinicName = new Paragraph("NHAN KHOA ANH SAO", fClinic);
            clinicName.setAlignment(Element.ALIGN_CENTER);
            doc.add(clinicName);

            Paragraph clinicSub = new Paragraph("Eyes Clinic Management System", fSub);
            clinicSub.setAlignment(Element.ALIGN_CENTER);
            clinicSub.setSpacingAfter(14f);
            doc.add(clinicSub);

            // ── Invoice title ─────────────────────────────────────────────
            Paragraph title = new Paragraph("HOA DON KHAM BENH", fTitle);
            title.setAlignment(Element.ALIGN_CENTER);
            doc.add(title);

            Paragraph codePara = new Paragraph("Ma hoa don: " + safe(inv.getInvoiceCode()), fCode);
            codePara.setAlignment(Element.ALIGN_CENTER);
            codePara.setSpacingAfter(16f);
            doc.add(codePara);

            // ── Patient / Doctor info ─────────────────────────────────────
            PdfPTable info = new PdfPTable(2);
            info.setWidthPercentage(100);
            info.setSpacingAfter(16f);

            addInfoRow(info, "Benh nhan:",    safe(inv.getPatientName()),
                             "Bac si:",       safe(inv.getDoctorName()),   fLabel, fValue);
            addInfoRow(info, "Ma benh nhan:", safe(inv.getPatientCode()),
                             "Dich vu:",      safe(inv.getServiceName()),  fLabel, fValue);
            addInfoRow(info, "SDT:",          safe(inv.getPatientPhone()),
                             "Ngay thanh toan:", inv.getPaidAt() != null
                                 ? inv.getPaidAt().format(DATE_FMT) : "Chua thanh toan", fLabel, fValue);
            doc.add(info);

            // ── Items table ───────────────────────────────────────────────
            PdfPTable tbl = new PdfPTable(new float[]{5f, 1f, 2f, 2f});
            tbl.setWidthPercentage(100);
            tbl.setSpacingAfter(4f);

            addTh(tbl, "Dich vu / Thuoc", Element.ALIGN_LEFT,   fTh);
            addTh(tbl, "SL",              Element.ALIGN_CENTER, fTh);
            addTh(tbl, "Don gia",         Element.ALIGN_RIGHT,  fTh);
            addTh(tbl, "Thanh tien",      Element.ALIGN_RIGHT,  fTh);

            List<InvoiceResponse.InvoiceItemResponse> items = inv.getItems();
            if (items != null) {
                for (InvoiceResponse.InvoiceItemResponse it : items) {
                    addTd(tbl, safe(it.getDescription()),                               Element.ALIGN_LEFT,   fTd);
                    addTd(tbl, String.valueOf(it.getQuantity() != null ? it.getQuantity() : 1), Element.ALIGN_CENTER, fTd);
                    addTd(tbl, fmtVnd(it.getUnitPrice()),                              Element.ALIGN_RIGHT,  fTd);
                    addTd(tbl, fmtVnd(it.getSubtotal()),                               Element.ALIGN_RIGHT,  fTd);
                }
            }
            doc.add(tbl);

            // ── Fee breakdown (only render if at least one fee > 0) ───────
            boolean hasFees = isPos(inv.getServiceFee())
                           || isPos(inv.getLabFee())
                           || isPos(inv.getMedicineFee());
            if (hasFees) {
                PdfPTable fees = new PdfPTable(2);
                fees.setWidthPercentage(45);
                fees.setHorizontalAlignment(Element.ALIGN_RIGHT);
                fees.setSpacingAfter(0f);
                if (isPos(inv.getServiceFee()))
                    addFeeRow(fees, "Phi dich vu:",    fmtVnd(inv.getServiceFee()),    fValue);
                if (isPos(inv.getLabFee()))
                    addFeeRow(fees, "Phi xet nghiem:", fmtVnd(inv.getLabFee()),        fValue);
                if (isPos(inv.getMedicineFee()))
                    addFeeRow(fees, "Phi thuoc:",      fmtVnd(inv.getMedicineFee()),   fValue);
                doc.add(fees);
            }

            // ── Total ─────────────────────────────────────────────────────
            PdfPTable totRow = new PdfPTable(2);
            totRow.setWidthPercentage(45);
            totRow.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totRow.setSpacingAfter(12f);

            PdfPCell tLbl = borderTop(new PdfPCell(new Phrase("TONG CONG:", fTotLbl)));
            tLbl.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totRow.addCell(tLbl);

            PdfPCell tVal = borderTop(new PdfPCell(new Phrase(fmtVnd(inv.getTotalAmount()), fTotal)));
            tVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totRow.addCell(tVal);

            doc.add(totRow);

            // ── Payment info ──────────────────────────────────────────────
            String payLabel = "CASH".equals(inv.getPaymentMethod())    ? "Tien mat"       :
                              "VIET_QR".equals(inv.getPaymentMethod()) ? "QR Code (VietQR)" : "-";
            Paragraph pay = new Paragraph("Phuong thuc thanh toan: " + payLabel, fSmall);
            pay.setSpacingAfter(2f);
            doc.add(pay);

            if (inv.getPaymentReference() != null && !inv.getPaymentReference().isBlank()) {
                doc.add(new Paragraph("Ma tham chieu: " + inv.getPaymentReference(), fSmall));
            }

            // ── Footer ────────────────────────────────────────────────────
            Paragraph footer = new Paragraph(
                    "\nCam on quy khach da tin tuong su dung dich vu cua chung toi.", fFooter);
            footer.setAlignment(Element.ALIGN_CENTER);
            footer.setSpacingBefore(24f);
            doc.add(footer);

            doc.close();
            return out.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Khong the tao PDF: " + e.getMessage(), e);
        }
    }

    // ── Font loading ──────────────────────────────────────────────────────────

    private BaseFont loadFont() throws Exception {
        // 1. Classpath font (add arial.ttf to src/main/resources/fonts/ for production)
        try (var stream = getClass().getResourceAsStream("/fonts/arial.ttf")) {
            if (stream != null) {
                byte[] bytes = stream.readAllBytes();
                return BaseFont.createFont("arial.ttf", BaseFont.IDENTITY_H,
                        true, true, bytes, null);
            }
        } catch (Exception ignored) {}

        // 2. Windows system Arial (dev environment)
        try {
            return BaseFont.createFont("C:/Windows/Fonts/arial.ttf",
                    BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
        } catch (Exception ignored) {}

        // 3. Built-in Helvetica fallback
        return BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252,
                BaseFont.NOT_EMBEDDED);
    }

    // ── Table helpers ─────────────────────────────────────────────────────────

    private void addInfoRow(PdfPTable t,
                             String l1, String v1, String l2, String v2,
                             Font fLabel, Font fValue) {
        t.addCell(infoCell(l1, v1, fLabel, fValue));
        t.addCell(infoCell(l2, v2, fLabel, fValue));
    }

    private PdfPCell infoCell(String label, String value, Font fLabel, Font fValue) {
        Paragraph p = new Paragraph();
        p.add(new Chunk(label + " ", fLabel));
        p.add(new Chunk(value, fValue));
        PdfPCell c = new PdfPCell(p);
        c.setBorder(Rectangle.NO_BORDER);
        c.setPaddingBottom(5f);
        return c;
    }

    private void addTh(PdfPTable t, String text, int align, Font f) {
        PdfPCell c = new PdfPCell(new Phrase(text, f));
        c.setBackgroundColor(COLOR_HEADER_BG);
        c.setHorizontalAlignment(align);
        c.setPadding(8f);
        c.setBorderColor(COLOR_BORDER);
        c.setBorderWidth(0.5f);
        t.addCell(c);
    }

    private void addTd(PdfPTable t, String text, int align, Font f) {
        PdfPCell c = new PdfPCell(new Phrase(text, f));
        c.setHorizontalAlignment(align);
        c.setPadding(7f);
        c.setBorderColor(COLOR_BORDER);
        c.setBorderWidth(0.5f);
        t.addCell(c);
    }

    private void addFeeRow(PdfPTable t, String label, String value, Font f) {
        PdfPCell lc = new PdfPCell(new Phrase(label, f));
        lc.setHorizontalAlignment(Element.ALIGN_RIGHT);
        lc.setBorder(Rectangle.NO_BORDER);
        lc.setPaddingBottom(4f);
        t.addCell(lc);

        PdfPCell vc = new PdfPCell(new Phrase(value, f));
        vc.setHorizontalAlignment(Element.ALIGN_RIGHT);
        vc.setBorder(Rectangle.NO_BORDER);
        vc.setPaddingBottom(4f);
        t.addCell(vc);
    }

    private PdfPCell borderTop(PdfPCell c) {
        c.setBorderWidthTop(1.5f);
        c.setBorderColorTop(COLOR_BORDER);
        c.setBorderWidthBottom(0f);
        c.setBorderWidthLeft(0f);
        c.setBorderWidthRight(0f);
        c.setPaddingTop(8f);
        return c;
    }

    // ── Formatting helpers ────────────────────────────────────────────────────

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
