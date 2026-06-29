// UC-57 - Manage System Audit Log
package com.ecms.service.impl;

import com.ecms.dto.response.AuditLogResponse;
import com.ecms.dto.response.PageResponse;
import com.ecms.entity.AuditLog;
import com.ecms.entity.User;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.AuditLogRepository;
import com.ecms.repository.UserRepository;
import com.ecms.service.AuditLogService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    private static final DateTimeFormatter CSV_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    @Transactional
    public void log(Long actorUserId, String action, String entityType, String entityId,
                     Object oldValue, Object newValue, String ipAddress) {
        User actor = actorUserId != null ? userRepository.findById(actorUserId).orElse(null) : null;

        AuditLog entry = AuditLog.builder()
                .user(actor)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .oldValue(toJson(oldValue))
                .newValue(toJson(newValue))
                .ipAddress(ipAddress)
                .build();
        auditLogRepository.save(entry);
    }

    @Override
    public PageResponse<AuditLogResponse> search(Long actorId, String action, String entityType, String entityId,
                                                   LocalDateTime dateFrom, LocalDateTime dateTo, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        var result = auditLogRepository.search(actorId, action, entityType, entityId, dateFrom, dateTo, pageable);
        return PageResponse.of(result.map(this::toResponse));
    }

    @Override
    public AuditLogResponse getById(Long id) {
        AuditLog entry = auditLogRepository.findByIdWithUser(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bản ghi audit log"));
        return toResponse(entry);
    }

    @Override
    public void exportCsv(Long actorId, String action, String entityType, String entityId,
                           LocalDateTime dateFrom, LocalDateTime dateTo, HttpServletResponse response) throws IOException {
        List<AuditLog> entries = auditLogRepository.searchAll(actorId, action, entityType, entityId, dateFrom, dateTo);

        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=audit_log.csv");
        response.getOutputStream().write(0xEF);
        response.getOutputStream().write(0xBB);
        response.getOutputStream().write(0xBF);

        try (PrintWriter writer = new PrintWriter(response.getOutputStream(), true, StandardCharsets.UTF_8)) {
            writer.println("id,created_at,actor,action,entity_type,entity_id,ip_address,old_value,new_value");
            for (AuditLog entry : entries) {
                writer.println(String.join(",",
                        csv(String.valueOf(entry.getId())),
                        csv(entry.getCreatedAt() != null ? entry.getCreatedAt().format(CSV_DATE_FORMAT) : ""),
                        csv(entry.getUser() != null ? entry.getUser().getFullName() : ""),
                        csv(entry.getAction()),
                        csv(entry.getEntityType()),
                        csv(entry.getEntityId()),
                        csv(entry.getIpAddress()),
                        csv(entry.getOldValue()),
                        csv(entry.getNewValue())));
            }
        }
    }

    private String toJson(Object value) {
        if (value == null) return null;
        if (value instanceof String s) return s;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            log.warn("Không thể serialize giá trị audit log sang JSON", e);
            return String.valueOf(value);
        }
    }

    private String csv(String value) {
        if (value == null) return "";
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }

    private AuditLogResponse toResponse(AuditLog entry) {
        User actor = entry.getUser();
        return AuditLogResponse.builder()
                .id(entry.getId())
                .actorId(actor != null ? actor.getId() : null)
                .actorName(actor != null ? actor.getFullName() : null)
                .actorEmail(actor != null ? actor.getEmail() : null)
                .action(entry.getAction())
                .entityType(entry.getEntityType())
                .entityId(entry.getEntityId())
                .oldValue(entry.getOldValue())
                .newValue(entry.getNewValue())
                .ipAddress(entry.getIpAddress())
                .createdAt(entry.getCreatedAt())
                .build();
    }
}
