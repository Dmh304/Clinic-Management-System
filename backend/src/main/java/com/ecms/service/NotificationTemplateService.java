// UC-56 - Configure System and Data
package com.ecms.service;

import com.ecms.dto.request.CreateNotificationTemplateRequest;
import com.ecms.dto.request.UpdateNotificationTemplateRequest;
import com.ecms.dto.response.NotificationTemplateResponse;

import java.util.List;

public interface NotificationTemplateService {

    List<NotificationTemplateResponse> getAll();

    NotificationTemplateResponse create(CreateNotificationTemplateRequest request, String actorEmail, String ipAddress);

    NotificationTemplateResponse update(Long id, UpdateNotificationTemplateRequest request, String actorEmail, String ipAddress);

    NotificationTemplateResponse deactivate(Long id, String actorEmail, String ipAddress);
}
