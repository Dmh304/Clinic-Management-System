package com.ecms.service.impl;

import com.ecms.dto.request.ChatMessageRequest;
import com.ecms.dto.response.ChatMessageResponse;
import com.ecms.dto.response.ChatSessionResponse;
import com.ecms.entity.ChatMessage;
import com.ecms.entity.ChatSession;
import com.ecms.entity.Patient;
import com.ecms.entity.User;
import com.ecms.exception.ResourceNotFoundException;
import com.ecms.repository.ChatMessageRepository;
import com.ecms.repository.ChatSessionRepository;
import com.ecms.repository.PatientRepository;
import com.ecms.repository.UserRepository;
import com.ecms.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(ChatMessageRequest request, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        String role = user.getRole().getName();
        String senderRole = role.equals("PATIENT") ? "PATIENT" : "RECEPTIONIST";

        ChatSession session = null;
        if (request.getSessionId() != null) {
            session = chatSessionRepository.findById(request.getSessionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        } else if (role.equals("PATIENT")) {
            Patient patient = patientRepository.findByUserId(user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
            session = chatSessionRepository.findByPatientIdAndStatus(patient.getId(), "ACTIVE")
                    .orElseGet(() -> chatSessionRepository.save(ChatSession.builder()
                            .patient(patient)
                            .status("ACTIVE")
                            .build()));
        } else {
            throw new IllegalArgumentException("Session ID is required for receptionist");
        }

        ChatMessage message = ChatMessage.builder()
                .session(session)
                .senderRole(senderRole)
                .content(request.getContent())
                .build();
        
        message = chatMessageRepository.save(message);
        
        // Update session updatedAt
        session.setUpdatedAt(message.getCreatedAt());
        chatSessionRepository.save(session);

        return toMessageResponse(message);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatSessionResponse> getActiveSessions() {
        return chatSessionRepository.findByStatusOrderByUpdatedAtDesc("ACTIVE").stream()
                .map(this::toSessionResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getMessagesBySession(Long sessionId) {
        return chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId).stream()
                .map(this::toMessageResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ChatSessionResponse getOrCreateSessionForPatient(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Patient patient = patientRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
        
        ChatSession session = chatSessionRepository.findByPatientIdAndStatus(patient.getId(), "ACTIVE")
                .orElseGet(() -> chatSessionRepository.save(ChatSession.builder()
                        .patient(patient)
                        .status("ACTIVE")
                        .build()));
        return toSessionResponse(session);
    }

    @Override
    @Transactional
    public void assignSession(Long sessionId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        session.setAssignedTo(user);
        chatSessionRepository.save(session);
    }

    private ChatSessionResponse toSessionResponse(ChatSession session) {
        return ChatSessionResponse.builder()
                .id(session.getId())
                .patientId(session.getPatient().getId())
                .patientName(session.getPatient().getFullName())
                .assignedToId(session.getAssignedTo() != null ? session.getAssignedTo().getId() : null)
                .assignedToName(session.getAssignedTo() != null ? session.getAssignedTo().getFullName() : null)
                .status(session.getStatus())
                .createdAt(session.getCreatedAt())
                .updatedAt(session.getUpdatedAt())
                .build();
    }

    private ChatMessageResponse toMessageResponse(ChatMessage message) {
        return ChatMessageResponse.builder()
                .id(message.getId())
                .sessionId(message.getSession().getId())
                .senderRole(message.getSenderRole())
                .content(message.getContent())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
