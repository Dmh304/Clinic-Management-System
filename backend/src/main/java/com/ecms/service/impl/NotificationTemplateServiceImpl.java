// UC-56 - Configure System and Data
package com.ecms.service.impl;

import com.ecms.dto.request.CreateNotificationTemplateRequest;
import com.ecms.dto.request.UpdateNotificationTemplateRequest;
import com.ecms.dto.response.NotificationTemplateResponse;
import com.ecms.entity.NotificationTemplate;
import com.ecms.entity.User;
import com.ecms.exception.ConflictException;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.NotificationTemplateRepository;
import com.ecms.repository.UserRepository;
import com.ecms.service.AuditLogService;
import com.ecms.service.NotificationTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class NotificationTemplateServiceImpl implements NotificationTemplateService {

    private static final Set<String> ALLOWED_CHANNELS = Set.of("EMAIL", "SMS", "IN_APP");

    private final NotificationTemplateRepository templateRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional(readOnly = true)
    public List<NotificationTemplateResponse> getAll() {
        return templateRepository.findAll(Sort.by("templateKey").ascending())
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public NotificationTemplateResponse create(CreateNotificationTemplateRequest request, String actorEmail, String ipAddress) {
        String key = request.getTemplateKey().trim().toUpperCase();
        String channel = validateChannel(request.getChannel());

        if (templateRepository.existsByTemplateKey(key)) {
            throw new ConflictException("Template key này đã tồn tại: " + key);
        }

        User actor = userRepository.findByEmail(actorEmail).orElse(null);

        NotificationTemplate template = NotificationTemplate.builder()
                .templateKey(key)
                .channel(channel)
                .subject(request.getSubject())
                .body(request.getBody())
                .variablesHint(request.getVariablesHint())
                .active(true)
                .updatedBy(actor)
                .updatedAt(LocalDateTime.now())
                .build();
        NotificationTemplate saved = templateRepository.save(template);

        auditLogService.log(actor != null ? actor.getId() : null, "CREATE_TEMPLATE", "NotificationTemplate",
                String.valueOf(saved.getId()), null, snapshot(saved), ipAddress);

        return toResponse(saved);
    }

    @Override
    @Transactional
    public NotificationTemplateResponse update(Long id, UpdateNotificationTemplateRequest request, String actorEmail, String ipAddress) {
        NotificationTemplate template = getOrThrow(id);
        Map<String, Object> oldValue = snapshot(template);

        User actor = userRepository.findByEmail(actorEmail).orElse(null);

        template.setSubject(request.getSubject());
        template.setBody(request.getBody());
        template.setVariablesHint(request.getVariablesHint());
        template.setUpdatedBy(actor);
        template.setUpdatedAt(LocalDateTime.now());
        NotificationTemplate saved = templateRepository.save(template);

        auditLogService.log(actor != null ? actor.getId() : null, "UPDATE_TEMPLATE", "NotificationTemplate",
                String.valueOf(saved.getId()), oldValue, snapshot(saved), ipAddress);

        return toResponse(saved);
    }

    @Override
    @Transactional
    public NotificationTemplateResponse deactivate(Long id, String actorEmail, String ipAddress) {
        NotificationTemplate template = getOrThrow(id);

        if (!template.isActive()) {
            throw new IllegalStateException("Template đã ở trạng thái deactivate");
        }

        Map<String, Object> oldValue = snapshot(template);
        User actor = userRepository.findByEmail(actorEmail).orElse(null);

        template.setActive(false);
        template.setUpdatedBy(actor);
        template.setUpdatedAt(LocalDateTime.now());
        NotificationTemplate saved = templateRepository.save(template);

        auditLogService.log(actor != null ? actor.getId() : null, "UPDATE_TEMPLATE", "NotificationTemplate",
                String.valueOf(saved.getId()), oldValue, snapshot(saved), ipAddress);

        return toResponse(saved);
    }

    // ───────────────────────────── Helpers ─────────────────────────────

    private String validateChannel(String channel) {
        if (channel == null || !ALLOWED_CHANNELS.contains(channel.trim().toUpperCase())) {
            throw new IllegalArgumentException("Channel không hợp lệ, phải là EMAIL, SMS hoặc IN_APP");
        }
        return channel.trim().toUpperCase();
    }

    private NotificationTemplate getOrThrow(Long id) {
        return templateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy template"));
    }

    private Map<String, Object> snapshot(NotificationTemplate template) {
        Map<String, Object> map = new HashMap<>();
        map.put("templateKey", template.getTemplateKey());
        map.put("channel", template.getChannel());
        map.put("subject", template.getSubject());
        map.put("body", template.getBody());
        map.put("variablesHint", template.getVariablesHint());
        map.put("active", template.isActive());
        return map;
    }

    private NotificationTemplateResponse toResponse(NotificationTemplate template) {
        return NotificationTemplateResponse.builder()
                .id(template.getId())
                .templateKey(template.getTemplateKey())
                .channel(template.getChannel())
                .subject(template.getSubject())
                .body(template.getBody())
                .variablesHint(template.getVariablesHint())
                .active(template.isActive())
                .updatedByName(template.getUpdatedBy() != null ? template.getUpdatedBy().getFullName() : null)
                .updatedAt(template.getUpdatedAt())
                .build();
    }
}
