package com.ecms.service;

import com.ecms.dto.response.AppointmentResponse;
import com.ecms.entity.AppointmentStatus;

import java.util.List;

public interface AppointmentService {

    List<AppointmentResponse> getTodayAppointments();

    AppointmentResponse updateAppointmentStatus(Long id, AppointmentStatus status);
}
