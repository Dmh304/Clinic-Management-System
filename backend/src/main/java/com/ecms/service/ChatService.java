package com.ecms.service;

import com.ecms.dto.request.ChatMessageRequest;
import com.ecms.dto.response.ChatMessageResponse;
import com.ecms.dto.response.ChatSessionResponse;
import org.springframework.security.core.Authentication;

import java.util.List;

public interface ChatService {
    ChatMessageResponse sendMessage(ChatMessageRequest request, String email);
    List<ChatSessionResponse> getActiveSessions();
    List<ChatMessageResponse> getMessagesBySession(Long sessionId);
    ChatSessionResponse getOrCreateSessionForPatient(String email);
    void assignSession(Long sessionId, String email);
}
