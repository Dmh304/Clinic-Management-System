// UC-56 - Configure System and Data
package com.ecms.repository;

import com.ecms.entity.NotificationTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NotificationTemplateRepository extends JpaRepository<NotificationTemplate, Long> {
    Optional<NotificationTemplate> findByTemplateKey(String templateKey);
    boolean existsByTemplateKey(String templateKey);
}
