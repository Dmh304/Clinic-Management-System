// DucTKH
// Repository cho Entity Invoice, hỗ trợ các thao tác truy xuất hóa đơn từ database.
package com.ecms.repository;

import com.ecms.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findByPatientId(Long patientId);
}
