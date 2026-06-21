// Le Thi Bich Ngan - HE204710
// Triển khai nghiệp vụ quản lý bệnh nhân.
// Xử lý hai chức năng chính:
//   1. Đăng ký bệnh nhân vãng lai: CCCD là định danh chính (không cho trùng), SĐT cho phép trùng
//      (vd: mẹ và con dùng chung SĐT liên hệ). Trẻ em dưới 14 tuổi không cần CCCD/email —
//      email được tự sinh dạng pt{code}@ecms.local để tạo tài khoản đăng nhập.
//   2. Tìm kiếm bệnh nhân theo tên, số điện thoại hoặc CCCD.

package com.ecms.service.impl;

import com.ecms.dto.request.PatientRequest;
import com.ecms.dto.response.PatientResponse;
import com.ecms.entity.Patient;
import com.ecms.entity.Role;
import com.ecms.entity.User;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.PatientRepository;
import com.ecms.repository.RoleRepository;
import com.ecms.repository.UserRepository;
import com.ecms.service.PatientService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ecms.exception.FieldValidationException;
import java.time.LocalDate;
import java.time.Period;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PatientServiceImpl implements PatientService {

        private final PatientRepository patientRepository;
        private final UserRepository userRepository;
        private final RoleRepository roleRepository;
        private final PasswordEncoder passwordEncoder;

    // Mật khẩu mặc định cấp cho bệnh nhân vãng lai khi tạo tài khoản lần đầu
    private static final String DEFAULT_PASSWORD = "Password@123";

    // Tuổi dưới mức này được xem là trẻ em — không yêu cầu CCCD/email, dùng thông tin phụ huynh
    private static final int CHILD_AGE_THRESHOLD = 14;

    // Đăng ký bệnh nhân vãng lai: CCCD (nếu có) và email (nếu có) phải không trùng trong hệ thống.
    // SĐT được phép trùng để hỗ trợ trường hợp phụ huynh và con dùng chung số liên hệ.
    // Nếu không có email (trẻ em), tự sinh email dạng pt{patientCode}@ecms.local để tạo tài khoản.
    // Ném FieldValidationException nếu có bất kỳ field nào vi phạm (trả về tất cả lỗi cùng lúc).
    @Override
    @Transactional
    public PatientResponse createWalkInPatient(PatientRequest request) {
        // Thu thập tất cả lỗi validation trước khi throw để frontend nhận đủ thông tin
        Map<String, String> errors = new LinkedHashMap<>();
        if (request.getCccd() != null && !request.getCccd().isBlank()
                && patientRepository.existsByCccd(request.getCccd())) {
            errors.put("cccd", "CCCD " + request.getCccd() + " đã có hồ sơ bệnh nhân trong hệ thống");
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()
                && userRepository.existsByEmail(request.getEmail())) {
            errors.put("email", "Email " + request.getEmail() + " đã được sử dụng trong hệ thống");
        }
        if (!errors.isEmpty()) {
            throw new FieldValidationException(errors);
        }

                Role patientRole = roleRepository.findByName("PATIENT")
                                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy vai trò PATIENT"));

        // Sinh mã bệnh nhân theo thứ tự: PT0001, PT0002,...
        long count = patientRepository.count();
        String patientCode = String.format("PT%04d", count + 1);

        // Trẻ em không có email → tự sinh email nội bộ để tạo tài khoản đăng nhập
        String email = (request.getEmail() == null || request.getEmail().isBlank())
                ? "pt" + patientCode + "@ecms.local"
                : request.getEmail();

        // Tạo tài khoản đăng nhập cho bệnh nhân với mật khẩu mặc định đã mã hóa
        User user = User.builder()
                .fullName(request.getFullName())
                .email(email)
                .phone(request.getPhone())
                .passwordHash(passwordEncoder.encode(DEFAULT_PASSWORD))
                .role(patientRole)
                .build();
        userRepository.save(user);

        // Tạo hồ sơ bệnh nhân và liên kết với tài khoản vừa tạo
        Patient patient = Patient.builder()
                .user(user)
                .patientCode(patientCode)
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .email(email)
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .address(request.getAddress())
                .cccd(request.getCccd())
                .emergencyContactName(request.getEmergencyContactName())
                .emergencyContactPhone(request.getEmergencyContactPhone())
                .build();

                return toResponse(patientRepository.save(patient));
        }

    // Tìm kiếm bệnh nhân theo từ khóa (tên, số điện thoại hoặc CCCD).
    // Nếu không có từ khóa thì trả về toàn bộ danh sách bệnh nhân.
    @Override
    public List<PatientResponse> searchPatients(String keyword) {
        List<Patient> patients = (keyword == null || keyword.trim().isEmpty())
                ? patientRepository.findAll()
                : patientRepository.searchByNameOrPhoneOrCccd(keyword.trim());
        return patients.stream().map(this::toResponse).collect(Collectors.toList());
    }

    // Chuyển đổi entity Patient sang DTO PatientResponse để trả về cho frontend
    private PatientResponse toResponse(Patient p) {
        Boolean isChild = p.getDateOfBirth() != null
                && Period.between(p.getDateOfBirth(), LocalDate.now()).getYears() < CHILD_AGE_THRESHOLD;
        return PatientResponse.builder()
                .id(p.getId())
                .patientCode(p.getPatientCode())
                .fullName(p.getFullName())
                .phone(p.getPhone())
                .email(p.getEmail())
                .dateOfBirth(p.getDateOfBirth())
                .gender(p.getGender())
                .address(p.getAddress())
                .cccd(p.getCccd())
                .emergencyContactName(p.getEmergencyContactName())
                .emergencyContactPhone(p.getEmergencyContactPhone())
                .isChild(isChild)
                .createdAt(p.getCreatedAt())
                .build();
    }
}
