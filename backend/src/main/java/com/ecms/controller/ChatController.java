//Author: DucTKH - HE204463
//Created: 2026-07-20
//Last Update: 2026-07-26

package com.ecms.controller;

import com.ecms.dto.request.ChatMessageRequest;
import com.ecms.dto.response.ChatMessageResponse;
import com.ecms.dto.response.ChatSessionResponse;
import com.ecms.dto.response.ApiResponse;
import com.ecms.service.ChatService;
import com.ecms.entity.User;
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
    @GetMapping("/api/v1/chat/sessions")
    public ResponseEntity<ApiResponse<List<ChatSessionResponse>>> getActiveSessions() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách phiên chat thành công", chatService.getActiveSessions()));
    }

    //Bệnh nhân khởi tạo hoặc lấy phiên chat của chính mình (UC-22).
    @GetMapping("/api/v1/chat/sessions/my")
    public ResponseEntity<ApiResponse<ChatSessionResponse>> getMySession(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Lấy phiên chat thành công", chatService.getOrCreateSessionForPatient(authentication.getName())));
    }

    //Tải lịch sử tin nhắn của một phiên chat (UC-22).
    @GetMapping("/api/v1/chat/sessions/{sessionId}/messages")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getMessages(@PathVariable Long sessionId, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Lấy tin nhắn thành công", chatService.getMessagesBySession(sessionId, authentication.getName())));
    }

    //Lễ tân giành quyền hoặc nhận phiên chat (UC-22).
    @PatchMapping("/api/v1/chat/sessions/{sessionId}/assign")
    public ResponseEntity<ApiResponse<Void>> assignSession(@PathVariable Long sessionId, Principal principal) {
        chatService.assignSession(sessionId, principal.getName());
        messagingTemplate.convertAndSend("/topic/chat/sessions", "UPDATE");
        return ResponseEntity.ok(ApiResponse.success("Nhận phiên chat thành công", null));
    }
}
