package com.ecms.repository;

import com.ecms.entity.VerificationToken;
import com.ecms.entity.VerificationTokenType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VerificationTokenRepository extends JpaRepository<VerificationToken, Long> {

    Optional<VerificationToken> findByTokenHashAndType(String tokenHash, VerificationTokenType type);

    List<VerificationToken> findByUser_IdAndTypeAndUsedFalse(Long userId, VerificationTokenType type);

    @Modifying
    @Query("update VerificationToken t set t.used = true where t.user.id = :userId and t.type = :type and t.used = false")
    void invalidateActiveTokens(Long userId, VerificationTokenType type);
}
