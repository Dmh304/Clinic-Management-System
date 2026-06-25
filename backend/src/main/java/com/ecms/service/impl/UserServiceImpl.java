// Mạnh Hùng - HE200743
// Triển khai nghiệp vụ quản lý hồ sơ người dùng.
// Hỗ trợ lấy thông tin hồ sơ kết hợp từ bảng User và Patient,
// cập nhật thông tin cá nhân, và tự động tạo bản ghi Patient nếu bệnh nhân tự đăng ký chưa có.
package com.ecms.service.impl;

import com.ecms.dto.request.UpdateProfileRequest;
import com.ecms.dto.response.UserProfileResponse;
import com.ecms.entity.Patient;
import com.ecms.entity.User;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.PatientRepository;
import com.ecms.repository.UserRepository;
import com.ecms.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;

    // Lấy thông tin hồ sơ người dùng: tìm User theo email, kết hợp dữ liệu Patient nếu có
    @Override
    public UserProfileResponse getProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));
        Optional<Patient> patient = patientRepository.findByUser_Email(email);
        return buildResponse(user, patient.orElse(null));
    }

    // Cập nhật hồ sơ: lưu thay đổi vào User và Patient; nếu bệnh nhân chưa có bản ghi Patient thì tạo mới
    @Override
    @Transactional
    public UserProfileResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        userRepository.save(user);

        Optional<Patient> patientOpt = patientRepository.findByUser_Email(email);
        if (patientOpt.isPresent()) {
            Patient patient = patientOpt.get();
            if (request.getFullName() != null && !request.getFullName().isBlank()) {
                patient.setFullName(request.getFullName());
            }
            if (request.getPhone() != null) {
                patient.setPhone(request.getPhone());
            }
            if (request.getDateOfBirth() != null) {
                patient.setDateOfBirth(request.getDateOfBirth());
            }
            if (request.getGender() != null) {
                patient.setGender(request.getGender());
            }
            if (request.getAddress() != null) {
                patient.setAddress(request.getAddress());
            }
            patientRepository.save(patient);
            return buildResponse(user, patient);
        }

        // Self-registered patients without a Patient record → create one
        if ("PATIENT".equals(user.getRole().getName())) {
            // Sinh mã bệnh nhân theo cùng quy tắc với bệnh nhân vãng lai (PT0001, PT0002,...)
            // để mọi Patient đều có patient_code ngay từ khi tạo, tránh giá trị NULL
            long count = patientRepository.count();
            String patientCode = String.format("PT%04d", count + 1);

            Patient patient = Patient.builder()
                    .user(user)
                    .patientCode(patientCode)
                    .fullName(user.getFullName())
                    .phone(user.getPhone())
                    .email(user.getEmail())
                    .dateOfBirth(request.getDateOfBirth())
                    .gender(request.getGender())
                    .address(request.getAddress())
                    .build();
            patientRepository.save(patient);
            return buildResponse(user, patient);
        }

        return buildResponse(user, null);
    }

    // Tạo đối tượng UserProfileResponse từ dữ liệu User và Patient (Patient có thể null với các role khác PATIENT)
    private UserProfileResponse buildResponse(User user, Patient patient) {
        return UserProfileResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(user.getRole() != null ? user.getRole().getName() : null)
                .dateOfBirth(patient != null ? patient.getDateOfBirth() : null)
                .gender(patient != null ? patient.getGender() : null)
                .address(patient != null ? patient.getAddress() : null)
                .createdAt(user.getCreatedAt())
                .build();
    }
}
