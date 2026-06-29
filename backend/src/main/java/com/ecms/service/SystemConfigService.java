// UC-56 - Configure System and Data
package com.ecms.service;

import com.ecms.dto.request.UpdateClinicInfoRequest;
import com.ecms.dto.response.ClinicInfoResponse;
import com.ecms.dto.response.RolePermissionResponse;

import java.util.List;

public interface SystemConfigService {

    ClinicInfoResponse getClinicInfo();

    ClinicInfoResponse updateClinicInfo(UpdateClinicInfoRequest request, String actorEmail, String ipAddress);

    List<RolePermissionResponse> getRolesPermissions();
}
