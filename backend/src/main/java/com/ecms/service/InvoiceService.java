package com.ecms.service;

import com.ecms.dto.request.InvoiceRequest;
import com.ecms.dto.response.InvoiceResponse;

import java.util.List;

public interface InvoiceService {

    List<InvoiceResponse> getAllInvoices();

    List<InvoiceResponse> searchInvoices(String keyword);

    InvoiceResponse getInvoiceById(Long id);

    InvoiceResponse getInvoiceByAppointmentId(Long appointmentId);

    InvoiceResponse createInvoice(InvoiceRequest request);

    InvoiceResponse issueInvoice(Long id, String paymentMethod, String paymentReference);

    InvoiceResponse cancelInvoice(Long id);

    void sendInvoiceEmail(Long id);

    byte[] generateInvoicePdf(Long id);
}
