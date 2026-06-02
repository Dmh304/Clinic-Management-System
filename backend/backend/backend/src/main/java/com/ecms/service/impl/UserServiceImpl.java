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

    @Override
    public UserProfileResponse getProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));
        Optional<Patient> patient = patientRepository.findByUser_Email(email);
        return buildResponse(user, patient.orElse(null));
    }

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
            Patient patient = Patient.builder()
                    .user(user)
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
