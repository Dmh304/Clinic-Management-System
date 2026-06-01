package com.ecms.service.impl;

import com.ecms.dto.request.PatientRequest;
import com.ecms.dto.response.PatientResponse;
import com.ecms.entity.Patient;
import com.ecms.repository.PatientRepository;
import com.ecms.service.PatientService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PatientServiceImpl implements PatientService {

    private final PatientRepository patientRepository;

    @Override
    @Transactional
    public PatientResponse createWalkInPatient(PatientRequest request) {
        if (patientRepository.existsByPhone(request.getPhone())) {
            throw new IllegalArgumentException(
                    "Số điện thoại " + request.getPhone() + " đã được đăng ký trong hệ thống");
        }

        Patient patient = Patient.builder()
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .address(request.getAddress())
                .build();

        return toResponse(patientRepository.save(patient));
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
