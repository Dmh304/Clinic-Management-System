// ThangNBHE201024 - HE187030
// Kiểm thử hợp đồng HTTP của API webhook thanh toán (UC-22).
// Dùng standalone MockMvc nên không cần database, kiểm tra đúng phần controller:
// parse JSON theo chuẩn SePay, chặn sai API key, và khóa endpoint demo ở production.
package com.ecms.controller;

import com.ecms.dto.request.PaymentWebhookRequest;
import com.ecms.service.PaymentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class PaymentControllerTest {

    @Mock
    private PaymentService paymentService;

    private MockMvc mockMvc;

    // Payload thật do SePay gửi khi tài khoản phòng khám nhận được tiền
    private static final String SEPAY_PAYLOAD = """
            {
              "id": "92704",
              "gateway": "Vietcombank",
              "transactionDate": "2025-07-17 14:02:37",
              "accountNumber": "1234567890",
              "content": "Thanh toan INV-20250717-0001",
              "transferType": "in",
              "transferAmount": 350000,
              "referenceCode": "MBVCB.3278907687",
              "accumulated": 19077000,
              "subAccount": null
            }
            """;

    @BeforeEach
    void setUp() {
        PaymentController controller = new PaymentController(paymentService, new ObjectMapper());
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    @DisplayName("Webhook đúng API key: parse payload SePay và trả trạng thái đối soát")
    void acceptsValidWebhook() throws Exception {
        when(paymentService.isValidApiKey("Apikey secret")).thenReturn(true);
        when(paymentService.handleWebhook(any(), anyString())).thenReturn("MATCHED");

        mockMvc.perform(post("/api/v1/payments/webhook")
                        .header("Authorization", "Apikey secret")
                        .contentType(APPLICATION_JSON)
                        .content(SEPAY_PAYLOAD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.status").value("MATCHED"));

        // Các field lạ của cổng (accumulated, subAccount) không được làm vỡ việc parse
        ArgumentCaptor<PaymentWebhookRequest> captor =
                ArgumentCaptor.forClass(PaymentWebhookRequest.class);
        verify(paymentService).handleWebhook(captor.capture(), anyString());
        PaymentWebhookRequest parsed = captor.getValue();
        assertThat(parsed.getId()).isEqualTo("92704");
        assertThat(parsed.getContent()).isEqualTo("Thanh toan INV-20250717-0001");
        assertThat(parsed.getTransferAmount()).isEqualByComparingTo(new BigDecimal("350000"));
        assertThat(parsed.getTransferType()).isEqualTo("in");
    }

    @Test
    @DisplayName("Sai API key: trả 401 và tuyệt đối không chạm vào hóa đơn")
    void rejectsInvalidApiKey() throws Exception {
        when(paymentService.isValidApiKey(anyString())).thenReturn(false);

        mockMvc.perform(post("/api/v1/payments/webhook")
                        .header("Authorization", "Apikey sai-key")
                        .contentType(APPLICATION_JSON)
                        .content(SEPAY_PAYLOAD))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));

        verify(paymentService, never()).handleWebhook(any(), anyString());
    }

    @Test
    @DisplayName("Thiếu hẳn header Authorization: trả 401")
    void rejectsMissingAuthHeader() throws Exception {
        when(paymentService.isValidApiKey(null)).thenReturn(false);

        mockMvc.perform(post("/api/v1/payments/webhook")
                        .contentType(APPLICATION_JSON)
                        .content(SEPAY_PAYLOAD))
                .andExpect(status().isUnauthorized());

        verify(paymentService, never()).handleWebhook(any(), anyString());
    }

}
