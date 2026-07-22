package com.ecms.service;

import com.ecms.dto.response.StaffResponse;

import java.util.List;

public interface StaffService {

    List<StaffResponse> getStaffByPosition(String position, String status);

    List<StaffResponse> getAllStaff(String status);
}