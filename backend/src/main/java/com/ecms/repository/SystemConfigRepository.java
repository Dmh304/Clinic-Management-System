// UC-56 - Configure System and Data
package com.ecms.repository;

import com.ecms.entity.SystemConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SystemConfigRepository extends JpaRepository<SystemConfig, Long> {
    Optional<SystemConfig> findByConfigKey(String configKey);
    boolean existsByConfigKey(String configKey);
    List<SystemConfig> findByConfigKeyIn(List<String> configKeys);
}
