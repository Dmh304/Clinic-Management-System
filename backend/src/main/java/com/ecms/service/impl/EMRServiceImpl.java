/**
 * Tuấn - HE204215
 * 
 * Class triển khai chi tiết các nghiệp vụ liên quan đến quản lý Hồ sơ bệnh án điện tử (EMR).
*/

package com.ecms.service.impl;

import com.ecms.dto.request.EMRRequest;
import com.ecms.dto.response.EMRResponse;
import com.ecms.entity.*;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.AppointmentRepository;
import com.ecms.repository.DoctorRepository;
import com.ecms.repository.LabOrderRepository;
import com.ecms.repository.LabResultRepository;
import com.ecms.repository.MedicalRecordRepository;
import com.ecms.service.EMRService;
import lombok.RequiredArgsConstructor;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EMRServiceImpl implements EMRService {

        /* Các repository phụ trách thao tác dữ liệu với cơ sở dữ liệu */
        private final MedicalRecordRepository medicalRecordRepository;
        private final AppointmentRepository appointmentRepository;
        private final DoctorRepository doctorRepository;
        private final LabOrderRepository labOrderRepository;
        private final LabResultRepository labResultRepository;
        private final ObjectMapper objectMapper;

        /* Hàm lưu hồ sơ bệnh án */
        @Override
        @Transactional
        public EMRResponse saveEMR(EMRRequest request) {

                // Tìm thông tin lịch hẹn dựa vào ID, ném lỗi nếu không tồn tại
                Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                                .orElseThrow(
                                                () -> new ResourceNotFoundException("Lịch hẹn không tồn tại: "
                                                                + request.getAppointmentId()));

                // Tìm thông tin Bác sĩ phụ trách
                Doctor doctor = doctorRepository.findById(request.getDoctorId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Bác sĩ không tồn tại: " + request.getDoctorId()));

                // Tìm Hồ sơ bệnh án cũ (nếu đã từng lưu nháp) hoặc tạo mới nếu chưa có
                MedicalRecord record = medicalRecordRepository
                                .findByAppointmentId(request.getAppointmentId())
                                .orElse(MedicalRecord.builder()
                                                .appointment(appointment)
                                                .patient(appointment.getPatient())
                                                .doctor(doctor)
                                                .build());

                // Cập nhật các trường thông tin khám bệnh (Lý do khám, triệu chứng, chẩn
                // đoán,...)
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

                // Xử lý trạng thái của Hồ sơ và Lịch hẹn tương ứng
                if (request.getStatus() != null) {
                        MedicalRecordStatus newStatus = MedicalRecordStatus.valueOf(request.getStatus());
                        record.setStatus(newStatus);

                        /*
                         * Nếu Lịch hẹn chưa được đánh dấu là HOÀN THÀNH (COMPLETED) trước đó,
                         * tiến hành đồng bộ trạng thái từ Bệnh án sang Lịch hẹn.
                         */
                        if (appointment.getStatus() != AppointmentStatus.COMPLETED) {
                                if (newStatus == MedicalRecordStatus.COMPLETED) {
                                        appointment.setStatus(AppointmentStatus.COMPLETED);
                                } else if (newStatus == MedicalRecordStatus.IN_PROGRESS) {
                                        appointment.setStatus(AppointmentStatus.IN_PROGRESS);
                                }
                                appointmentRepository.save(appointment);
                        }
                }

                // Lưu hồ sơ xuống database và trả về DTO
                return toResponse(medicalRecordRepository.save(record));
        }

        // Hàm lấy hồ sơ bệnh án dựa trên ID lịch hẹn
        @Override
        @Transactional(readOnly = true)
        public EMRResponse getOrCreateByAppointmentId(Long appointmentId, Long doctorId) {
                // Nếu đã có record thì trả về luôn
                Optional<MedicalRecord> existing = medicalRecordRepository.findByAppointmentId(appointmentId);
                if (existing.isPresent()) {
                        return toResponse(existing.get());
                }

                Appointment appointment = appointmentRepository.findById(appointmentId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Lịch hẹn không tồn tại: " + appointmentId));

                Doctor doctor = doctorRepository.findById(doctorId)
                                .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ không tồn tại: " + doctorId));

                MedicalRecord record = MedicalRecord.builder()
                                .appointment(appointment)
                                .patient(appointment.getPatient())
                                .doctor(doctor)
                                .status(MedicalRecordStatus.IN_PROGRESS)
                                .build();

                // Đồng bộ appointment status
                if (appointment.getStatus() != AppointmentStatus.COMPLETED) {
                        appointment.setStatus(AppointmentStatus.IN_PROGRESS);
                        appointmentRepository.save(appointment);
                }

                return toResponse(medicalRecordRepository.save(record));
                // return medicalRecordRepository.findByAppointmentId(appointmentId)
                // .map(this::toResponse)
                // .orElse(null);
        }

        // Hàm lấy danh sách lịch sử các lần khám trước đó của một bệnh nhân
        @Override
        @Transactional(readOnly = true)
        public List<EMRResponse> getPatientHistory(Long patientId) {
                return medicalRecordRepository.findByPatientIdOrderByCreatedAtDesc(patientId)
                                .stream()
                                .map(this::toResponse)
                                .collect(Collectors.toList());
        }

        @Override
        @Transactional(readOnly = true)
        public List<EMRResponse> getCompletedList(Long doctorId) {
                return medicalRecordRepository
                                .findByStatusAndDoctorIdOrderByCreatedAtDesc(MedicalRecordStatus.COMPLETED, doctorId)
                                .stream()
                                .map(this::toResponse)
                                .collect(Collectors.toList());
        }

        // Hàm tiện ích chuyển đổi Entity MedicalRecord sang DTO EMRResponse
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
                                .patientDob(m.getPatient() != null ? m.getPatient().getDateOfBirth() : null)
                                .patientGender(m.getPatient() != null ? m.getPatient().getGender() : null)
                                .patientAddress(m.getPatient() != null ? m.getPatient().getAddress() : null)
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
                                .labImageUrls(resolveLabImageUrls(m))
                                .status(m.getStatus() != null ? m.getStatus().name() : null)
                                .createdAt(m.getCreatedAt())
                                .updatedAt(m.getUpdatedAt())
                                .build();
        }

        @Override
        @Transactional(readOnly = true)
        public EMRResponse getById(Long id) {
                return medicalRecordRepository.findById(id)
                                .map(this::toResponse)
                                .orElse(null);
        }

        @Override
        @Transactional(readOnly = true)
        public List<EMRResponse> getAllList() {
                return medicalRecordRepository
                                .findAllByOrderByCreatedAtDesc()
                                .stream()
                                .map(this::toResponse)
                                .collect(Collectors.toList());
        }

        private List<String> resolveLabImageUrls(MedicalRecord m) {
                return labOrderRepository
                                .findByMedicalRecordIdOrderByCreatedAtDesc(m.getId())
                                .stream()
                                .filter(o -> o.getStatus() == LabOrderStatus.APPROVED)
                                .findFirst()
                                .flatMap(o -> labResultRepository.findTopByLabOrderIdOrderByIdDesc(o.getId()))
                                .map(r -> fromJson(r.getImageUrls()))
                                .orElse(List.of());
        }

        private String toJson(List<String> urls) {
                if (urls == null || urls.isEmpty())
                        return null;
                try {
                        return objectMapper.writeValueAsString(urls);
                } catch (Exception e) {
                        return null;
                }
        }

        private List<String> fromJson(String json) {
                if (json == null || json.isBlank())
                        return List.of();
                try {
                        return objectMapper.readValue(json, new TypeReference<List<String>>() {
                        });
                } catch (Exception e) {
                        return List.of();
                }
        }
}
