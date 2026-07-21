package com.ecms.repository;

import com.ecms.entity.EyeglassCoating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EyeglassCoatingRepository extends JpaRepository<EyeglassCoating, Long> {
}
