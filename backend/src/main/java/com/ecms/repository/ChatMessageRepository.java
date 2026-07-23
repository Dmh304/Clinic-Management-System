//Author: DucTKH - HE204463
//Created: 2026-07-12
//Last Update: 2026-07-23

package com.ecms.repository;

import com.ecms.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(Long sessionId);
}
