package com.ecms.service.impl;

import com.ecms.dto.request.EMRRequest;
import com.ecms.dto.response.EMRResponse;
import com.ecms.entity.*;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.AppointmentRepository;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.MedicalRecordRepository;
import com.ecms.service.EMRService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EMRServiceImpl implements EMRService {

    private final MedicalRecordRepository medicalRecordRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;

    @Override
    @Transactional
    public EMRResponse saveEMR(EMRRequest request) {
        System.out.println(">>> saveEMR called, appointmentId=" + request.getAppointmentId() + ", doctorId="
                + request.getDoctorId());

        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(
                        () -> new ResourceNotFoundException("Lịch hẹn không tồn tại: " + request.getAppointmentId()));
        System.out.println(">>> appointment found: " + appointment.getId());

        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ không tồn tại: " + request.getDoctorId()));
        System.out.println(">>> doctor found: " + doctor.getId());

        MedicalRecord record = medicalRecordRepository
                .findByAppointmentId(request.getAppointmentId())
                .orElse(MedicalRecord.builder()
                        .appointment(appointment)
                        .patient(appointment.getPatient())
                        .doctor(doctor)
                        .build());

        record.setDoctor(doctor);
        record.setChiefComplaint(request.getChiefComplaint());
        record.setSymptoms(request.getSymptoms());
        record.setDiagnosis(request.getDiagnosis());
        record.setTreatmentPlan(request.getTreatmentPlan());
        record.setNotes(request.getNotes());
        record.setVaL(request.getVaL());
        record.setVaR(request.getVaR());
        record.setBcvaL(request.getBcvaL());
        record.setBcvaR(request.getBcvaR());
        record.setSphL(request.getSphL());
        record.setCylL(request.getCylL());
        record.setAxisL(request.getAxisL());
        record.setIopL(request.getIopL());
        record.setSphR(request.getSphR());
        record.setCylR(request.getCylR());
        record.setAxisR(request.getAxisR());
        record.setIopR(request.getIopR());

        if (request.getStatus() != null) {
            record.setStatus(MedicalRecordStatus.valueOf(request.getStatus()));
        }

        return toResponse(medicalRecordRepository.save(record));
    }

    @Override
    @Transactional(readOnly = true)
    public EMRResponse getByAppointmentId(Long appointmentId) {
        return medicalRecordRepository.findByAppointmentId(appointmentId)
                .map(this::toResponse)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EMRResponse> getPatientHistory(Long patientId) {
        return medicalRecordRepository.findByPatientIdOrderByCreatedAtDesc(patientId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private EMRResponse toResponse(MedicalRecord m) {
        Appointment appt = m.getAppointment();
        return EMRResponse.builder()
                .id(m.getId())
                .appointmentId(appt != null ? appt.getId() : null)
                .appointmentTime(appt != null ? appt.getAppointmentTime() : null)
                .timeSlot(appt != null ? appt.getTimeSlot() : null)
                .patientId(m.getPatient() != null ? m.getPatient().getId() : null)
                .patientName(m.getPatient() != null ? m.getPatient().getFullName() : null)
                .patientPhone(m.getPatient() != null ? m.getPatient().getPhone() : null)
                .doctorId(m.getDoctor() != null ? m.getDoctor().getId() : null)
                .doctorName(m.getDoctor() != null ? m.getDoctor().getFullName() : null)
                .chiefComplaint(m.getChiefComplaint())
                .symptoms(m.getSymptoms())
                .diagnosis(m.getDiagnosis())
                .treatmentPlan(m.getTreatmentPlan())
                .notes(m.getNotes())
                .vaL(m.getVaL()).vaR(m.getVaR())
                .bcvaL(m.getBcvaL()).bcvaR(m.getBcvaR())
                .sphL(m.getSphL()).cylL(m.getCylL()).axisL(m.getAxisL()).iopL(m.getIopL())
                .sphR(m.getSphR()).cylR(m.getCylR()).axisR(m.getAxisR()).iopR(m.getIopR())
                .status(m.getStatus() != null ? m.getStatus().name() : null)
                .createdAt(m.getCreatedAt())
                .updatedAt(m.getUpdatedAt())
                .build();
    }
}
