/**
 * Author: TuanTD
 * 
 * * Class triển khai chi tiết các nghiệp vụ liên quan đến quản lý Hồ sơ bệnh án điện tử (EMR)
 * Cung cấp các chức năng: Lưu/Cập nhật bệnh án, Khởi tạo tự động, Truy xuất lịch sử bệnh nhân,
 * và tích hợp đồng bộ trạng thái với Lịch hẹn (Appointment) cùng Kết quả xét nghiệm (Lab Results)
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Annotation @Service: Đánh dấu lớp này là một Spring Service Component để
 * Spring Container quản lý (Dependency Injection)
 * Annotation @RequiredArgsConstructor: Tự động sinh Constructor cho tất cả các
 * thuộc tính được khai báo là `final` (Lombok)
 */
@Service
@RequiredArgsConstructor
public class EMRServiceImpl implements EMRService {

        /* Các repository phụ trách thao tác dữ liệu với cơ sở dữ liệu */
        private final MedicalRecordRepository medicalRecordRepository;
        private final AppointmentRepository appointmentRepository;
        private final DoctorRepository doctorRepository;
        private final LabOrderRepository labOrderRepository;
        private final LabResultRepository labResultRepository;
        private final com.ecms.service.PrescriptionService prescriptionService;
        private final com.ecms.service.EyeglassPrescriptionService eyeglassPrescriptionService;

        /*
         * ObjectMapper: Công cụ hỗ trợ parse/convert dữ liệu chuỗi JSON (dùng cho mảng
         * ảnh xét nghiệm)
         */
        private final ObjectMapper objectMapper;

        /* Lưu hoặc Cập nhật Hồ sơ bệnh án (EMR) */
        @Override
        @Transactional // Đảm bảo tính toàn vẹn dữ liệu (Atomic). Nếu có lỗi xảy ra, toàn bộ thao tác
                       // ghi DB sẽ bị rollback
        public EMRResponse saveEMR(EMRRequest request) {

                // Kiểm tra tính hợp lệ của Lịch hẹn. Nếu không thấy, ném ngoại lệ 404
                // (ResourceNotFoundException)
                Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                                .orElseThrow(
                                                () -> new ResourceNotFoundException("Lịch hẹn không tồn tại: "
                                                                + request.getAppointmentId()));

                // Kiểm tra tính hợp lệ của Bác sĩ phụ trách
                Doctor doctor = doctorRepository.findById(request.getDoctorId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Bác sĩ không tồn tại: " + request.getDoctorId()));

                // Tìm Hồ sơ bệnh án cũ dựa theo ID lịch hẹn (nếu bác sĩ đã từng lưu
                // nháp/IN_PROGRESS trước đó)
                // Nếu chưa từng có bệnh án cho lịch hẹn này, tiến hành khởi tạo mới (Sử dụng
                // Builder Pattern)
                MedicalRecord record = medicalRecordRepository
                                .findByAppointmentId(request.getAppointmentId())
                                .orElse(MedicalRecord.builder()
                                                .appointment(appointment)
                                                .patient(appointment.getPatient())
                                                .doctor(doctor)
                                                .build());

                // Đồng bộ/Cập nhật các thông tin lâm sàng và kết quả khám mắt (Các chỉ số thị
                // lực) vào Entity
                record.setDoctor(doctor);
                record.setChiefComplaint(request.getChiefComplaint()); // Lý do đến khám
                record.setSymptoms(request.getSymptoms()); // Triệu chứng lâm sàng
                record.setDiagnosis(request.getDiagnosis()); // Chẩn đoán xác định từ bác sĩ
                record.setTreatmentPlan(request.getTreatmentPlan()); // Phác đồ điều trị / Đơn thuốc
                record.setNotes(request.getNotes()); // Ghi chú thêm

                // Cập nhật các chỉ số chuyên khoa mắt (Thị lực mắt Trái - L / Mắt Phải - R)
                record.setVaL(request.getVaL()); // Thị lực không kính mắt trái
                record.setVaR(request.getVaR()); // Thị lực không kính mắt phải
                record.setBcvaL(request.getBcvaL()); // Thị lực có kính tối ưu mắt trái
                record.setBcvaR(request.getBcvaR()); // Thị lực có kính tối ưu mắt phải
                record.setSphL(request.getSphL()); // Độ cầu mắt trái (Cận/Viễn)
                record.setCylL(request.getCylL()); // Độ loạn mắt trái
                record.setAxisL(request.getAxisL()); // Trục loạn mắt trái
                record.setIopL(request.getIopL()); // Nhãn áp mắt trái
                record.setSphR(request.getSphR()); // Độ cầu mắt phải
                record.setCylR(request.getCylR()); // Độ loạn mắt phải
                record.setAxisR(request.getAxisR()); // Trục loạn mắt phải
                record.setIopR(request.getIopR()); // Nhãn áp mắt phải

                // Xử lý logic nghiệp vụ về Trạng thái (Status) của Bệnh án và Lịch hẹn
                if (request.getStatus() != null) {
                        // Chuyển đổi chuỗi String status từ request sang Enum tương ứng
                        MedicalRecordStatus newStatus = MedicalRecordStatus.valueOf(request.getStatus());
                        record.setStatus(newStatus);

                        /*
                         * Logic đồng bộ trạng thái:
                         * Nếu Lịch hẹn gốc chưa hoàn thành (chưa COMPLETED) thì cập nhật trạng thái
                         * lịch hẹn
                         * đi theo trạng thái mới của bệnh án (Ví dụ: Bệnh án COMPLETED -> Lịch hẹn
                         * COMPLETED)
                         */
                        if (appointment.getStatus() != AppointmentStatus.COMPLETED) {
                                if (newStatus == MedicalRecordStatus.COMPLETED) {
                                        appointment.setStatus(AppointmentStatus.COMPLETED);
                                } else if (newStatus == MedicalRecordStatus.IN_PROGRESS) {
                                        appointment.setStatus(AppointmentStatus.IN_PROGRESS);
                                }
                                // Lưu lại trạng thái mới của lịch hẹn vào Database
                                appointmentRepository.save(appointment);
                        }
                }

                // Thực hiện lưu trữ/cập nhật hồ sơ bệnh án vào DB và trả ra dữ liệu dạng DTO
                // response
                return toResponse(medicalRecordRepository.save(record));
        }

        /*
         * Nghiệp vụ: Lấy thông tin bệnh án hiện tại hoặc Tự động khởi tạo mới (Lazy
         * Initialization) khi bác sĩ bắt đầu khám
         */
        @Override
        @Transactional
        public EMRResponse getOrCreateByAppointmentId(Long appointmentId, Long doctorId) {
                // Nếu đã có hồ sơ bệnh án gắn với lịch hẹn này từ trước thì trả về ngay lập tức
                Optional<MedicalRecord> existing = medicalRecordRepository.findByAppointmentId(appointmentId);
                if (existing.isPresent()) {
                        return toResponse(existing.get());
                }

                // Nếu chưa có, tiến hành lấy thông tin Lịch hẹn và Bác sĩ để tự động tạo bản
                // ghi nháp (IN_PROGRESS)
                Appointment appointment = appointmentRepository.findById(appointmentId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Lịch hẹn không tồn tại: " + appointmentId));

                Doctor doctor = doctorRepository.findById(doctorId)
                                .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ không tồn tại: " + doctorId));

                // Khởi tạo đối tượng MedicalRecord mới với trạng thái ban đầu là ĐANG KHÁM
                // (IN_PROGRESS)
                MedicalRecord record = MedicalRecord.builder()
                                .appointment(appointment)
                                .patient(appointment.getPatient())
                                .doctor(doctor)
                                .status(MedicalRecordStatus.IN_PROGRESS)
                                .build();

                // Đồng bộ hóa trạng thái lịch hẹn sang IN_PROGRESS (Bệnh nhân đã vào phòng
                // khám)
                if (appointment.getStatus() != AppointmentStatus.COMPLETED) {
                        appointment.setStatus(AppointmentStatus.IN_PROGRESS);
                        appointmentRepository.save(appointment);
                }

                // Lưu bệnh án nháp vào DB và convert sang DTO để trả về Frontend hiển thị lên
                // màn hình khám
                return toResponse(medicalRecordRepository.save(record));
        }

        /* Lấy danh sách lịch sử tất cả các lần khám bệnh trước đây của một bệnh nhân */
        @Override
        @Transactional(readOnly = true) // readOnly = true giúp tối ưu hóa hiệu năng truy vấn (Spring không cần quản lý
                                        // dirty-checking)
        public List<EMRResponse> getPatientHistory(Long patientId) {
                return medicalRecordRepository.findByPatientIdOrderByCreatedAtDesc(patientId)
                                .stream() // Chuyển đổi List sang Stream để xử lý Functional Programming
                                .map(this::toResponse) // Map từng Entity MedicalRecord sang DTO EMRResponse
                                .collect(Collectors.toList()); // Thu gom kết quả lại thành dạng List
        }

        /*
         * Lấy danh sách các hồ sơ bệnh án đã HOÀN THÀNH (COMPLETED) do một bác sĩ cụ
         * thể phụ trách
         */
        @Override
        @Transactional(readOnly = true)
        public List<EMRResponse> getCompletedList(Long doctorId) {
                return medicalRecordRepository
                                .findByStatusAndDoctorIdOrderByCreatedAtDesc(MedicalRecordStatus.COMPLETED, doctorId)
                                .stream()
                                .map(this::toResponse)
                                .collect(Collectors.toList());
        }

        /* Chi tiết hóa/Tìm kiếm hồ sơ bệnh án bằng ID của chính bệnh án đó */
        @Override
        @Transactional(readOnly = true)
        public EMRResponse getById(Long id) {
                return medicalRecordRepository.findById(id)
                                .map(this::toResponse) // Nếu tìm thấy (Optional.isPresent), thực hiện map sang DTO
                                .orElse(null); // Nếu không tìm thấy, trả về null
        }

        /* Lấy toàn bộ danh sách hồ sơ bệnh án trong hệ thống */
        @Override
        @Transactional(readOnly = true)
        public List<EMRResponse> getAllList() {
                return medicalRecordRepository
                                .findAllByOrderByCreatedAtDesc()
                                .stream()
                                .map(this::toResponse)
                                .collect(Collectors.toList());
        }

        /* Chuyển đổi dữ liệu từ Entity (MedicalRecord) sang DTO (EMRResponse) */
        private EMRResponse toResponse(MedicalRecord m) {
                Appointment appt = m.getAppointment(); // Lấy thông tin lịch hẹn đi kèm để bóc tách dữ liệu thời gian

                return EMRResponse.builder()
                                .id(m.getId())
                                // Bóc tách thông tin từ đối tượng Appointment liên kết (kiểm tra null-safe đề
                                // phòng lịch hẹn bị trống)
                                .appointmentId(appt != null ? appt.getId() : null)
                                .appointmentTime(appt != null ? appt.getAppointmentTime() : null)
                                .timeSlot(appt != null ? appt.getTimeSlot() : null)
                                // Bóc tách thông tin hành chính của Bệnh nhân (Patient) liên quan
                                .patientId(m.getPatient() != null ? m.getPatient().getId() : null)
                                .patientName(m.getPatient() != null ? m.getPatient().getFullName() : null)
                                .patientPhone(m.getPatient() != null ? m.getPatient().getPhone() : null)
                                .patientDob(m.getPatient() != null ? m.getPatient().getDateOfBirth() : null)
                                .patientGender(m.getPatient() != null ? m.getPatient().getGender() : null)
                                .patientAddress(m.getPatient() != null ? m.getPatient().getAddress() : null)
                                // Bóc tách thông tin Bác sĩ (Doctor) thực hiện khám
                                .doctorId(m.getDoctor() != null ? m.getDoctor().getId() : null)
                                .doctorName(m.getDoctor() != null ? m.getDoctor().getFullName() : null)
                                .doctorPhone(m.getDoctor() != null ? m.getDoctor().getPhone() : null)
                                .serviceName(m.getAppointment() != null
                                                && m.getAppointment().getClinicService() != null
                                                                ? m.getAppointment().getClinicService().getServiceName()
                                                                : null)
                                // Map các dữ liệu chẩn đoán, lâm sàng
                                .chiefComplaint(m.getChiefComplaint())
                                .symptoms(m.getSymptoms())
                                .diagnosis(m.getDiagnosis())
                                .treatmentPlan(m.getTreatmentPlan())
                                .notes(m.getNotes())
                                // Map các chỉ số đo thị lực chuyên khoa mắt
                                .vaL(m.getVaL()).vaR(m.getVaR())
                                .bcvaL(m.getBcvaL()).bcvaR(m.getBcvaR())
                                .sphL(m.getSphL()).cylL(m.getCylL()).axisL(m.getAxisL()).iopL(m.getIopL())
                                .sphR(m.getSphR()).cylR(m.getCylR()).axisR(m.getAxisR()).iopR(m.getIopR())
                                // Gọi hàm phụ trợ để lấy danh sách URL hình ảnh xét nghiệm liên quan đến bệnh
                                // án này
                                .labImageUrls(resolveLabImageUrls(m))
                                .status(m.getStatus() != null ? m.getStatus().name() : null)
                                .createdAt(m.getCreatedAt())
                                .updatedAt(m.getUpdatedAt())
                                .prescriptions(prescriptionService.getByMedicalRecordId(m.getId()).stream()
                                        .filter(p -> p.getStatus() == com.ecms.entity.PrescriptionStatus.DISPENSED)
                                        .collect(Collectors.toList()))
                                .eyeglassPrescriptions(eyeglassPrescriptionService.getByMedicalRecordId(m.getId()))
                                .build();
        }

        /* Tìm kiếm và phân giải (resolve) các đường dẫn hình ảnh kết quả xét nghiệm */
        private List<String> resolveLabImageUrls(MedicalRecord m) {
                return labOrderRepository
                                .findByMedicalRecordIdOrderByCreatedAt(m.getId()) // Lấy danh sách lệnh xét nghiệm
                                                                                  // theo thứ tự mới nhất
                                .stream()
                                .filter(o -> o.getStatus() == LabOrderStatus.APPROVED) // Chỉ chấp nhận các lệnh có
                                                                                       // trạng thái APPROVED
                                .findFirst() // Lấy ra phiếu xét nghiệm hợp lệ đầu tiên (chính là cái mới nhất)
                                .flatMap(o -> labResultRepository.findTopByLabOrderIdOrderByIdDesc(o.getId())) // Tìm
                                                                                                               // kết
                                                                                                               // quả
                                                                                                               // xét
                                                                                                               // nghiệm
                                                                                                               // mới
                                                                                                               // nhất
                                                                                                               // dựa
                                                                                                               // trên
                                                                                                               // ID
                                                                                                               // phiếu
                                .map(r -> fromJson(r.getImageUrls())) // Chuyển chuỗi JSON dạng ["url1", "url2"] từ DB
                                                                      // thành List<String> ở Java
                                .orElse(List.of()); // Nếu không có kết quả hoặc không tìm thấy, mặc định trả về danh
                                                    // sách rỗng (List rỗng)
        }

        /*
         * Biến đổi một chuỗi văn bản thuần (String JSON) thành cấu trúc danh sách Java
         * List<String>
         */
        private List<String> fromJson(String json) {
                // Kiểm tra điều kiện chuỗi đầu vào bị trống hoặc null
                if (json == null || json.isBlank())
                        return List.of();
                try {
                        // Thực hiện phân rã chuỗi JSON sang cấu trúc dữ liệu mong muốn (List<String>)
                        return objectMapper.readValue(json, new TypeReference<List<String>>() {
                        });
                } catch (Exception e) {
                        // Khối catch bao bọc phòng trường hợp chuỗi JSON bị sai định dạng (Malformatted
                        // JSON) -> Tránh làm sập ứng dụng
                        return List.of();
                }
        }
}

