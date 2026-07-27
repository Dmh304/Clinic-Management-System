package com.ecms.security;

import com.ecms.backend.BackendApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiểm chứng thực tế lỗ hổng phân quyền ở SecurityConfig cho nhóm endpoint
 * /api/v1/appointments/*: 2 khối .requestMatchers(...) trùng lặp (do dán 2 lần
 * khi merge code) khiến khối wildcard "/appointments/**" (không có PATIENT)
 * đứng TRƯỚC các rule cụ thể hơn cho /cancel và /reschedule (có PATIENT) trong
 * danh sách matcher — mà Spring Security xét theo đúng thứ tự khai báo, khớp
 * matcher nào trước dùng luôn rule đó — nên rule cụ thể phía sau không bao giờ
 * được dùng tới (dead code) và PATIENT bị chặn nhầm ở 2 endpoint tự thân này.
 *
 * Các test này CHỈ kiểm tra quyền truy cập (không phải 403), không quan tâm
 * kết quả nghiệp vụ cuối cùng (id không tồn tại nên các luồng dưới đều trả về
 * 404 — điều đó chứng minh request đã lọt qua được lớp authorization).
 */
@SpringBootTest(classes = BackendApplication.class)
@AutoConfigureMockMvc
class AppointmentAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(username = "patient1@gmail.com", roles = "PATIENT")
    void patientCanReachCancelEndpoint() throws Exception {
        mockMvc.perform(patch("/api/v1/appointments/999999/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    org.junit.jupiter.api.Assertions.assertNotEquals(403, status,
                            "PATIENT bị 403 ở /cancel — rule wildcard đang che mất rule cụ thể cho PATIENT");
                });
    }

    @Test
    @WithMockUser(username = "patient1@gmail.com", roles = "PATIENT")
    void patientCanReachRescheduleEndpoint() throws Exception {
        mockMvc.perform(patch("/api/v1/appointments/999999/reschedule")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newAppointmentTime\":\"2099-01-01T10:00:00\"}"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    org.junit.jupiter.api.Assertions.assertNotEquals(403, status,
                            "PATIENT bị 403 ở /reschedule — rule wildcard đang che mất rule cụ thể cho PATIENT");
                });
    }

    @Test
    @WithMockUser(username = "recep@ecms.vn", roles = "RECEPTIONIST")
    void receptionistCanReachReassignEndpoint() throws Exception {
        mockMvc.perform(patch("/api/v1/appointments/999999/reassign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"test\"}"))
                .andExpect(status().isNotFound()); // id không tồn tại -> 404, KHÔNG phải 403
    }

    @Test
    @WithMockUser(username = "doctor1@ecms.vn", roles = "DOCTOR")
    void doctorStillCannotReachReassignEndpoint() throws Exception {
        mockMvc.perform(patch("/api/v1/appointments/999999/reassign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"test\"}"))
                .andExpect(status().isForbidden()); // DOCTOR không có quyền reassign -> vẫn phải 403
    }
}
