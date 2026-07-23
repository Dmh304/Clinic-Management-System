//Author: DucTKH - HE204463
//Created: 2026-07-20
//Last Update: 2026-07-23

package com.ecms.controller;

import com.ecms.dto.request.ChatMessageRequest;
import com.ecms.dto.response.ChatMessageResponse;
import com.ecms.dto.response.ChatSessionResponse;
import com.ecms.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import java.security.Principal;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    //WebSocket endpoint gửi và nhận tin nhắn cho Bệnh nhân và Lễ tân (UC-22).
    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload ChatMessageRequest request, Principal principal) {
        ChatMessageResponse response = chatService.sendMessage(request, principal.getName());
        
        // Broadcast the message to the session topic
        messagingTemplate.convertAndSend("/topic/chat/" + response.getSessionId(), response);
        
        // Also notify receptionist dashboard about session update
        messagingTemplate.convertAndSend("/topic/chat/sessions", "UPDATE");
    }

    // REST endpoints
    //Lấy danh sách các phiên chat đang hoạt động để Lễ tân tiếp nhận (UC-22).
    @GetMapping("/api/chat/sessions")
    public ResponseEntity<List<ChatSessionResponse>> getActiveSessions() {
        return ResponseEntity.ok(chatService.getActiveSessions());
    }

    //Bệnh nhân khởi tạo hoặc lấy phiên chat của chính mình (UC-22).
    @GetMapping("/api/chat/sessions/my")
    public ResponseEntity<ChatSessionResponse> getMySession(Authentication authentication) {
        return ResponseEntity.ok(chatService.getOrCreateSessionForPatient(authentication.getName()));
    }

    //Tải lịch sử tin nhắn của một phiên chat (UC-22).
    @GetMapping("/api/chat/sessions/{sessionId}/messages")
    public ResponseEntity<List<ChatMessageResponse>> getMessages(@PathVariable Long sessionId) {
        return ResponseEntity.ok(chatService.getMessagesBySession(sessionId));
    }

    //Lễ tân giành quyền hoặc nhận phiên chat (UC-22).
    @PatchMapping("/api/chat/sessions/{sessionId}/assign")
    public ResponseEntity<Void> assignSession(@PathVariable Long sessionId, Principal principal) {
        chatService.assignSession(sessionId, principal.getName());
        messagingTemplate.convertAndSend("/topic/chat/sessions", "UPDATE");
        return ResponseEntity.ok().build();
    }
}
