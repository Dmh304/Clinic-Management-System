package com.ecms.service;

import com.ecms.dto.request.AssignNurseRequest;
import com.ecms.dto.request.BookCareSessionRequest;
import com.ecms.dto.response.CareSessionResponse;
import com.ecms.dto.response.NurseResponse;

import java.time.LocalDate;
import java.util.List;

public interface CareSessionService {

    CareSessionResponse book(BookCareSessionRequest request, String currentUserEmail);

    List<CareSessionResponse> getMySessions(String currentUserEmail);

    List<CareSessionResponse> getAllSessions(LocalDate date);

    List<CareSessionResponse> getNurseQueue(String nurseEmail);

    List<CareSessionResponse> getSessionsBySubscription(Long subscriptionId);

    CareSessionResponse assignNurse(Long id, AssignNurseRequest request);

    CareSessionResponse startSession(Long id, String nurseEmail);

    CareSessionResponse completeSession(Long id, String nurseNotes, String nurseEmail);

    CareSessionResponse checkoutSession(Long id, String receptionistEmail);

    CareSessionResponse cancelSession(Long id, String currentUserEmail);

    List<NurseResponse> getAllNurses();
}
