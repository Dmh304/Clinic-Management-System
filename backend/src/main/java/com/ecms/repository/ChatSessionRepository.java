package com.ecms.repository;

import com.ecms.entity.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {
    Optional<ChatSession> findByPatientIdAndStatus(Long patientId, String status);
    List<ChatSession> findByStatusOrderByUpdatedAtDesc(String status);
}
