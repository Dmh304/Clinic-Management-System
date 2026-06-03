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

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PatientServiceImpl implements PatientService {

        private final PatientRepository patientRepository;
        private final UserRepository userRepository;
        private final RoleRepository roleRepository;
        private final PasswordEncoder passwordEncoder;

        private static final String DEFAULT_PASSWORD = "Password@123";

        @Override
        @Transactional
        public PatientResponse createWalkInPatient(PatientRequest request) {
                if (patientRepository.existsByPhone(request.getPhone())) {
                        throw new IllegalArgumentException(
                                        "Số điện thoại " + request.getPhone() + " đã được đăng ký trong hệ thống");
                }
                if (userRepository.existsByEmail(request.getEmail())) {
                        throw new IllegalArgumentException(
                                        "Email " + request.getEmail() + " đã được sử dụng trong hệ thống");
                }

                Role patientRole = roleRepository.findByName("PATIENT")
                                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy vai trò PATIENT"));

                User user = User.builder()
                                .fullName(request.getFullName())
                                .email(request.getEmail())
                                .phone(request.getPhone())
                                .passwordHash(passwordEncoder.encode(DEFAULT_PASSWORD))
                                .role(patientRole)
                                .build();
                userRepository.save(user);

                Patient patient = Patient.builder()
                                .user(user)
                                .fullName(request.getFullName())
                                .phone(request.getPhone())
                                .email(request.getEmail())
                                .dateOfBirth(request.getDateOfBirth())
                                .gender(request.getGender())
                                .address(request.getAddress())
                                .build();

                return toResponse(patientRepository.save(patient));
        }

        @Override
        public List<PatientResponse> searchPatients(String keyword) {
                List<Patient> patients = (keyword == null || keyword.trim().isEmpty())
                                ? patientRepository.findAll()
                                : patientRepository.searchByNameOrPhone(keyword.trim());
                return patients.stream().map(this::toResponse).collect(Collectors.toList());
        }

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
