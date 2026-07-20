package com.ecms.service;

import com.ecms.entity.Patient;
import com.ecms.entity.Prescription;
import com.ecms.entity.PrescriptionItem;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class PrescriptionPdfService {

    private static final Color C_PRIMARY    = new Color(15,  118, 110); // teal-700
    private static final Color C_DARK       = new Color(15,  23,  42);  // slate-900
    private static final Color C_MUTED      = new Color(100, 116, 139); // slate-500
    private static final Color C_BORDER     = new Color(203, 213, 225); // slate-300
    private static final Color C_ROW_ALT    = new Color(248, 250, 252); // slate-50
    private static final Color C_WHITE      = new Color(255, 255, 255);
    private static final Color C_HEADER_BG  = new Color(17,  24,  39);  // gray-900

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter DATE_ONLY_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] generate(Prescription prescription, boolean hideSignature) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A5, 24f, 24f, 24f, 24f);
            PdfWriter.getInstance(doc, out);
            doc.open();

            BaseFont bf = loadFont();

            Font fClinicName = new Font(bf, 14, Font.BOLD, C_WHITE);
            Font fClinicInfo = new Font(bf, 8, Font.NORMAL, new Color(209, 213, 219));
            Font fTitle      = new Font(bf, 16, Font.BOLD, C_PRIMARY);
            Font fSubTitle   = new Font(bf, 9, Font.NORMAL, C_MUTED);
            
            Font fLabel      = new Font(bf, 10, Font.BOLD, C_DARK);
            Font fValue      = new Font(bf, 10, Font.NORMAL, C_DARK);
            
            Font fTh         = new Font(bf, 9, Font.BOLD, C_WHITE);
            Font fTdTitle    = new Font(bf, 9, Font.BOLD, C_DARK);
            Font fTdDesc     = new Font(bf, 9, Font.NORMAL, C_MUTED);
            Font fTd         = new Font(bf, 9, Font.NORMAL, C_DARK);
            
            Font fFooter     = new Font(bf, 9, Font.ITALIC, C_MUTED);
            Font fSignLabel  = new Font(bf, 9, Font.BOLD, C_DARK);

            // 1. HEADER
            PdfPTable headerTbl = new PdfPTable(1);
            headerTbl.setWidthPercentage(100);
            headerTbl.setSpacingAfter(12f);

            PdfPCell hCell = new PdfPCell();
            hCell.setBackgroundColor(C_HEADER_BG);
            hCell.setPaddingTop(12f);
            hCell.setPaddingBottom(12f);
            hCell.setBorder(Rectangle.NO_BORDER);

            Paragraph pName = new Paragraph("NHAN KHOA ANH SAO", fClinicName);
            pName.setAlignment(Element.ALIGN_CENTER);
            hCell.addElement(pName);

            Paragraph pInfo = new Paragraph("85 P. Bà Triệu, Q. Hai Bà Trưng, Hà Nội   |   ĐT: 0338986263", fClinicInfo);
            pInfo.setAlignment(Element.ALIGN_CENTER);
            pInfo.setSpacingBefore(3f);
            hCell.addElement(pInfo);

            headerTbl.addCell(hCell);
            doc.add(headerTbl);

            // 2. TITLE
            Paragraph title = new Paragraph("ĐƠN THUỐC", fTitle);
            title.setAlignment(Element.ALIGN_CENTER);
            doc.add(title);
            
            Paragraph code = new Paragraph("Mã đơn: DT-" + prescription.getId() + " - Ngày kê: " + (prescription.getCreatedAt() != null ? prescription.getCreatedAt().format(DATE_FMT) : ""), fSubTitle);
            code.setAlignment(Element.ALIGN_CENTER);
            code.setSpacingAfter(16f);
            doc.add(code);

            // 3. PATIENT INFO
            Patient patient = prescription.getPatient();
            
            PdfPTable pInfoTbl = new PdfPTable(4);
            pInfoTbl.setWidthPercentage(100);
            pInfoTbl.setWidths(new float[]{1.5f, 3f, 1f, 1.8f});
            pInfoTbl.setSpacingAfter(16f);
            
            addCell(pInfoTbl, "Họ và tên:", fLabel, Rectangle.NO_BORDER);
            addCell(pInfoTbl, safe(patient.getFullName()), fValue, Rectangle.NO_BORDER);
            addCell(pInfoTbl, "Tuổi:", fLabel, Rectangle.NO_BORDER);
            
            String age = "";
            if (patient.getDateOfBirth() != null) {
                age = String.valueOf(Period.between(patient.getDateOfBirth(), LocalDate.now()).getYears());
            }
            addCell(pInfoTbl, age, fValue, Rectangle.NO_BORDER);
            
            addCell(pInfoTbl, "Giới tính:", fLabel, Rectangle.NO_BORDER);
            String genderStr = "Nam";
            if ("FEMALE".equals(patient.getGender())) genderStr = "Nữ";
            addCell(pInfoTbl, safe(patient.getGender() != null ? genderStr : null), fValue, Rectangle.NO_BORDER);
            addCell(pInfoTbl, "ĐT:", fLabel, Rectangle.NO_BORDER);
            addCell(pInfoTbl, safe(patient.getPhone()), fValue, Rectangle.NO_BORDER);
            
            addCell(pInfoTbl, "Địa chỉ:", fLabel, Rectangle.NO_BORDER);
            PdfPCell addrCell = new PdfPCell(new Phrase(safe(patient.getAddress()), fValue));
            addrCell.setBorder(Rectangle.NO_BORDER);
            addrCell.setColspan(3);
            pInfoTbl.addCell(addrCell);
            
            addCell(pInfoTbl, "Chẩn đoán:", fLabel, Rectangle.NO_BORDER);
            String diagnosis = "";
            if (prescription.getMedicalRecord() != null && prescription.getMedicalRecord().getDiagnosis() != null) {
                diagnosis = prescription.getMedicalRecord().getDiagnosis();
            }
            PdfPCell diagCell = new PdfPCell(new Phrase(safe(diagnosis), fValue));
            diagCell.setBorder(Rectangle.NO_BORDER);
            diagCell.setColspan(3);
            pInfoTbl.addCell(diagCell);

            doc.add(pInfoTbl);

            // 4. ITEMS TABLE
            PdfPTable itemsTbl = new PdfPTable(new float[]{0.8f, 5f, 1.5f});
            itemsTbl.setWidthPercentage(100);
            itemsTbl.setSpacingAfter(16f);

            PdfPCell cTh1 = new PdfPCell(new Phrase("STT", fTh));
            cTh1.setBackgroundColor(C_PRIMARY);
            cTh1.setBorderColor(C_BORDER);
            cTh1.setPadding(6f);
            itemsTbl.addCell(cTh1);

            PdfPCell cTh2 = new PdfPCell(new Phrase("Tên thuốc - Hàm lượng", fTh));
            cTh2.setBackgroundColor(C_PRIMARY);
            cTh2.setBorderColor(C_BORDER);
            cTh2.setPadding(6f);
            itemsTbl.addCell(cTh2);

            PdfPCell cTh3 = new PdfPCell(new Phrase("Số lượng", fTh));
            cTh3.setBackgroundColor(C_PRIMARY);
            cTh3.setBorderColor(C_BORDER);
            cTh3.setPadding(6f);
            cTh3.setHorizontalAlignment(Element.ALIGN_CENTER);
            itemsTbl.addCell(cTh3);

            List<PrescriptionItem> items = prescription.getItems();
            int stt = 1;
            for (PrescriptionItem item : items) {
                boolean alt = (stt % 2 == 0);
                
                PdfPCell c1 = new PdfPCell(new Phrase(String.valueOf(stt), fTd));
                styleCell(c1, alt, Element.ALIGN_CENTER);
                itemsTbl.addCell(c1);
                
                PdfPCell c2 = new PdfPCell();
                Paragraph pNameForm = new Paragraph(item.getMedicine().getName() + " (" + safe(item.getMedicine().getDosageForm()) + ")", fTdTitle);
                c2.addElement(pNameForm);
                
                String usage = buildUsageString(item);
                Paragraph pDesc = new Paragraph(usage, fTdDesc);
                pDesc.setSpacingBefore(2f);
                c2.addElement(pDesc);
                
                styleCell(c2, alt, Element.ALIGN_LEFT);
                itemsTbl.addCell(c2);
                
                PdfPCell c3 = new PdfPCell(new Phrase(item.getQuantity() + " " + safe(item.getMedicine().getUnit()), fTd));
                styleCell(c3, alt, Element.ALIGN_CENTER);
                itemsTbl.addCell(c3);
                
                stt++;
            }
            doc.add(itemsTbl);

            // 5. NOTES & FOOTER
            if (prescription.getNotes() != null && !prescription.getNotes().isEmpty()) {
                Paragraph pNotes = new Paragraph("Lời dặn: " + prescription.getNotes(), fValue);
                pNotes.setSpacingAfter(16f);
                doc.add(pNotes);
            }
            
            Paragraph pWarn = new Paragraph("Khám lại xin mang theo đơn này.", fFooter);
            doc.add(pWarn);
            
            Paragraph pDate = new Paragraph("Hà Nội, ngày " + LocalDate.now().getDayOfMonth() + " tháng " + LocalDate.now().getMonthValue() + " năm " + LocalDate.now().getYear(), fFooter);
            pDate.setAlignment(Element.ALIGN_RIGHT);
            doc.add(pDate);

            if (!hideSignature) {
                PdfPTable signTbl = new PdfPTable(2);
                signTbl.setWidthPercentage(100);
                
                PdfPCell emptyLeft = new PdfPCell(new Phrase(""));
                emptyLeft.setBorder(Rectangle.NO_BORDER);
                signTbl.addCell(emptyLeft);
                
                PdfPCell rightCell = new PdfPCell();
                rightCell.setBorder(Rectangle.NO_BORDER);
                rightCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                
                Paragraph pSign = new Paragraph("Bác sĩ khám bệnh", fSignLabel);
                pSign.setAlignment(Element.ALIGN_CENTER);
                pSign.setSpacingBefore(5f);
                pSign.setSpacingAfter(40f);
                rightCell.addElement(pSign);
                
                Paragraph pDocName = new Paragraph(prescription.getDoctor().getFullName(), fSignLabel);
                pDocName.setAlignment(Element.ALIGN_CENTER);
                rightCell.addElement(pDocName);
                
                signTbl.addCell(rightCell);
                doc.add(signTbl);
            }

            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi tạo PDF đơn thuốc", e);
        }
    }
    
    private String buildUsageString(PrescriptionItem item) {
        StringBuilder sb = new StringBuilder("Cách dùng: ");
        boolean hasContent = false;
        if (isValid(item.getDosage())) {
            sb.append(item.getDosage());
            hasContent = true;
        }
        if (isValid(item.getFrequency())) {
            if (hasContent) sb.append(". ");
            sb.append(item.getFrequency());
            hasContent = true;
        }
        if (isValid(item.getInstructions())) {
            if (hasContent) sb.append(". ");
            sb.append(item.getInstructions());
            hasContent = true;
        }
        return hasContent ? sb.toString() : "";
    }

    private boolean isValid(String str) {
        return str != null && !str.trim().isEmpty() && !str.trim().equals("-");
    }

    private void styleCell(PdfPCell cell, boolean altRow, int align) {
        if (altRow) cell.setBackgroundColor(C_ROW_ALT);
        cell.setBorderColor(C_BORDER);
        cell.setPadding(6f);
        cell.setHorizontalAlignment(align);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
    }

    private void addCell(PdfPTable tbl, String text, Font f, int border) {
        PdfPCell c = new PdfPCell(new Phrase(text, f));
        c.setBorder(border);
        c.setPadding(4f);
        tbl.addCell(c);
    }

    private BaseFont loadFont() throws Exception {
        try (var stream = getClass().getResourceAsStream("/fonts/arial.ttf")) {
            if (stream != null) {
                byte[] bytes = stream.readAllBytes();
                return BaseFont.createFont("arial.ttf", BaseFont.IDENTITY_H, true, true, bytes, null);
            }
        } catch (Exception ignored) {}
        try {
            return BaseFont.createFont("C:/Windows/Fonts/arial.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
        } catch (Exception ignored) {}
        return BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
    }
    
    private String safe(String s) {
        return s != null ? s : "";
    }
}
