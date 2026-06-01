package com.ecms.controller;

import com.ecms.dto.request.PatientRequest;
import com.ecms.dto.response.ApiResponse;
import com.ecms.dto.response.PatientResponse;
import com.ecms.service.PatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    @PostMapping("/walk-in")
    public ResponseEntity<ApiResponse<PatientResponse>> createWalkInPatient(
            @Valid @RequestBody PatientRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(patientService.createWalkInPatient(request)));
    }
}
