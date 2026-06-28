// UC-56 - Configure System and Data
package com.ecms.service.impl;

import com.ecms.dto.request.UpdateClinicInfoRequest;
import com.ecms.dto.response.ClinicInfoResponse;
import com.ecms.dto.response.RolePermissionResponse;
import com.ecms.entity.SystemConfig;
import com.ecms.entity.User;
import com.ecms.repository.SystemConfigRepository;
import com.ecms.repository.UserRepository;
import com.ecms.service.AuditLogService;
import com.ecms.service.SystemConfigService;
import com.ecms.util.RolePermissionCatalog;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SystemConfigServiceImpl implements SystemConfigService {

    private static final String CLINIC_NAME = "CLINIC_NAME";
    private static final String CLINIC_PHONE = "CLINIC_PHONE";
    private static final String CLINIC_ADDRESS = "CLINIC_ADDRESS";
    private static final String CLINIC_HOURS = "CLINIC_HOURS";
    private static final List<String> CLINIC_INFO_KEYS = List.of(CLINIC_NAME, CLINIC_PHONE, CLINIC_ADDRESS, CLINIC_HOURS);

    private final SystemConfigRepository systemConfigRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional(readOnly = true)
    public ClinicInfoResponse getClinicInfo() {
        Map<String, SystemConfig> configs = loadClinicConfigs();
        return toClinicInfoResponse(configs);
    }

    @Override
    @Transactional
    public ClinicInfoResponse updateClinicInfo(UpdateClinicInfoRequest request, String actorEmail, String ipAddress) {
        Map<String, SystemConfig> configs = loadClinicConfigs();
        Map<String, Object> oldValue = toMap(toClinicInfoResponse(configs));

        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        LocalDateTime now = LocalDateTime.now();

        setConfigValue(configs.get(CLINIC_NAME), request.getClinicName(), actor, now);
        setConfigValue(configs.get(CLINIC_PHONE), request.getClinicPhone(), actor, now);
        setConfigValue(configs.get(CLINIC_ADDRESS), request.getClinicAddress(), actor, now);
        setConfigValue(configs.get(CLINIC_HOURS), request.getClinicHours(), actor, now);

        configs.values().forEach(systemConfigRepository::save);

        ClinicInfoResponse newResponse = toClinicInfoResponse(configs);
        auditLogService.log(actor != null ? actor.getId() : null, "UPDATE_CONFIG", "SystemConfig", "CLINIC_INFO",
                oldValue, toMap(newResponse), ipAddress);

        return newResponse;
    }

    @Override
    public List<RolePermissionResponse> getRolesPermissions() {
        return RolePermissionCatalog.all().entrySet().stream()
                .map(entry -> RolePermissionResponse.builder()
                        .role(entry.getKey())
                        .permissions(entry.getValue())
                        .build())
                .toList();
    }

    // ───────────────────────────── Helpers ─────────────────────────────

    private Map<String, SystemConfig> loadClinicConfigs() {
        List<SystemConfig> found = systemConfigRepository.findByConfigKeyIn(CLINIC_INFO_KEYS);
        Map<String, SystemConfig> byKey = new HashMap<>();
        found.forEach(c -> byKey.put(c.getConfigKey(), c));

        for (String key : CLINIC_INFO_KEYS) {
            byKey.computeIfAbsent(key, k -> SystemConfig.builder()
                    .configKey(k)
                    .configValue("")
                    .dataType("STRING")
                    .build());
        }
        return byKey;
    }

    private void setConfigValue(SystemConfig config, String value, User actor, LocalDateTime now) {
        config.setConfigValue(value);
        config.setUpdatedBy(actor);
        config.setUpdatedAt(now);
    }

    private ClinicInfoResponse toClinicInfoResponse(Map<String, SystemConfig> configs) {
        LocalDateTime updatedAt = configs.values().stream()
                .map(SystemConfig::getUpdatedAt)
                .filter(java.util.Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);

        return ClinicInfoResponse.builder()
                .clinicName(configs.get(CLINIC_NAME).getConfigValue())
                .clinicPhone(configs.get(CLINIC_PHONE).getConfigValue())
                .clinicAddress(configs.get(CLINIC_ADDRESS).getConfigValue())
                .clinicHours(configs.get(CLINIC_HOURS).getConfigValue())
                .updatedAt(updatedAt)
                .build();
    }

    private Map<String, Object> toMap(ClinicInfoResponse response) {
        Map<String, Object> map = new HashMap<>();
        map.put("clinicName", response.getClinicName());
        map.put("clinicPhone", response.getClinicPhone());
        map.put("clinicAddress", response.getClinicAddress());
        map.put("clinicHours", response.getClinicHours());
        return map;
    }
}
