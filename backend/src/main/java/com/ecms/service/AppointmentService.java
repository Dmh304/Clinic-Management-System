package com.ecms.service;

import com.ecms.dto.request.WalkInAppointmentRequest;
import com.ecms.dto.response.AppointmentDashboardResponse;
import com.ecms.dto.response.AppointmentResponse;
import com.ecms.entity.AppointmentStatus;

import java.time.LocalDate;
import java.util.List;

public interface AppointmentService {

    List<AppointmentResponse> getTodayAppointments();

    AppointmentResponse updateAppointmentStatus(Long id, AppointmentStatus status);

    List<AppointmentResponse> getAllAppointments();

    AppointmentResponse confirmAppointment(Long id, Long doctorId);

    AppointmentResponse checkInAppointment(Long id);

    List<AppointmentResponse> searchAppointments(String keyword);

    List<AppointmentResponse> getDoctorQueue(LocalDate date);

    AppointmentResponse createWalkInAppointment(WalkInAppointmentRequest request);

    AppointmentDashboardResponse getDashboard(LocalDate date);
}