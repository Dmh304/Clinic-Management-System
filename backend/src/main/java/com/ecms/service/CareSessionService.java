package com.ecms.service;

import com.ecms.dto.request.AssignNurseRequest;
import com.ecms.dto.request.BookCareSessionRequest;
import com.ecms.dto.response.AutoAssignResult;
import com.ecms.dto.response.CareSessionResponse;
import com.ecms.dto.response.NurseResponse;

import java.time.LocalDate;
import java.util.List;

public interface CareSessionService {

    CareSessionResponse book(BookCareSessionRequest request, String currentUserEmail);

    List<CareSessionResponse> getMySessions(String currentUserEmail);

    /** Lấy 1 buổi khám theo id — kiểm tra quyền xem theo vai trò (nurse chỉ xem buổi của mình,
     *  patient chỉ xem buổi của mình, staff xem được mọi buổi). */
    CareSessionResponse getById(Long id, String currentUserEmail);

    List<CareSessionResponse> getAllSessions(LocalDate date);

    List<CareSessionResponse> getNurseQueue(String nurseEmail, LocalDate date);

    List<CareSessionResponse> getSessionsBySubscription(Long subscriptionId);

    CareSessionResponse assignNurse(Long id, AssignNurseRequest request, String actorEmail, String ipAddress);

    /** UC-19 ALT-1: tự động phân công mọi buổi BOOKED chưa có điều dưỡng trong ngày, chia đều
     *  theo tải hiện tại và sức chứa. Trả về số buổi đã phân công / còn lại chưa phân công được. */
    AutoAssignResult autoAssignRemaining(LocalDate date, String actorEmail, String ipAddress);

    /** Lễ tân xác nhận khách đã đến quầy — phải check-in trước khi điều dưỡng được bắt đầu. */
    CareSessionResponse checkInSession(Long id, String receptionistEmail);

    CareSessionResponse startSession(Long id, String nurseEmail);

    CareSessionResponse completeSession(Long id, String nurseNotes, Boolean isIncident, String nurseEmail);

    CareSessionResponse checkoutSession(Long id, String receptionistEmail);

    CareSessionResponse cancelSession(Long id, String currentUserEmail);

    List<NurseResponse> getAllNurses();
}
