// DucTKH
// Repository cho Entity Medicine, thực hiện các truy vấn cơ sở dữ liệu liên quan đến Thuốc.
package com.ecms.repository;

import com.ecms.entity.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, Long> {
    List<Medicine> findByNameContainingIgnoreCase(String name);
}
