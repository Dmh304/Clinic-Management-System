// Le Thi Bich Ngan - HE204710
// Triển khai nghiệp vụ quản lý bệnh nhân.
// Xử lý hai chức năng chính:
//   1. Đăng ký bệnh nhân vãng lai: kiểm tra trùng lặp toàn bộ trước khi tạo,
//      tự sinh mã bệnh nhân, tạo tài khoản User gắn với hồ sơ Patient.
//   2. Tìm kiếm bệnh nhân theo tên hoặc số điện thoại.

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

    // Đăng ký bệnh nhân vãng lai: kiểm tra đồng thời cả phone lẫn email trùng trước khi xử lý,
    // tạo tài khoản User với mật khẩu mặc định, sinh mã PT (PT0001, PT0002,...) và lưu hồ sơ Patient.
    // Ném FieldValidationException nếu có bất kỳ field nào vi phạm (trả về tất cả lỗi cùng lúc).
    @Override
    @Transactional
    public PatientResponse createWalkInPatient(PatientRequest request) {
        // Thu thập tất cả lỗi validation trước khi throw để frontend nhận đủ thông tin
        Map<String, String> errors = new LinkedHashMap<>();
        if (patientRepository.existsByPhone(request.getPhone())) {
            errors.put("phone", "Số điện thoại " + request.getPhone() + " đã được đăng ký trong hệ thống");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            errors.put("email", "Email " + request.getEmail() + " đã được sử dụng trong hệ thống");
        }
        if (!errors.isEmpty()) {
            throw new FieldValidationException(errors);
        }

        Role patientRole = roleRepository.findByName("PATIENT")
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy vai trò PATIENT"));

        // Tạo tài khoản đăng nhập cho bệnh nhân với mật khẩu mặc định đã mã hóa
        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .passwordHash(passwordEncoder.encode(DEFAULT_PASSWORD))
                .role(patientRole)
                .build();
        userRepository.save(user);

        // Sinh mã bệnh nhân theo thứ tự: PT0001, PT0002,...
        long count = patientRepository.count();
        String patientCode = String.format("PT%04d", count + 1);

        // Tạo hồ sơ bệnh nhân và liên kết với tài khoản vừa tạo
        Patient patient = Patient.builder()
                .user(user)
                .patientCode(patientCode)
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .address(request.getAddress())
                .build();

        return toResponse(patientRepository.save(patient));
    }

    // Tìm kiếm bệnh nhân theo từ khóa (tên hoặc số điện thoại).
    // Nếu không có từ khóa thì trả về toàn bộ danh sách bệnh nhân.
    @Override
    public List<PatientResponse> searchPatients(String keyword) {
        List<Patient> patients = (keyword == null || keyword.trim().isEmpty())
                ? patientRepository.findAll()
                : patientRepository.searchByNameOrPhone(keyword.trim());
        return patients.stream().map(this::toResponse).collect(Collectors.toList());
    }

    // Chuyển đổi entity Patient sang DTO PatientResponse để trả về cho frontend
    private PatientResponse toResponse(Patient p) {
        return PatientResponse.builder()
                .id(p.getId())
                .fullName(p.getFullName())
                .phone(p.getPhone())
                .email(p.getEmail())
                .dateOfBirth(p.getDateOfBirth())
                .gender(p.getGender())
                .address(p.getAddress())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
