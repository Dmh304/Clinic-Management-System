// DucTKH
// Repository cho Entity InvoiceItem, hỗ trợ các thao tác truy xuất chi tiết hóa đơn từ database.
package com.ecms.repository;

import com.ecms.entity.InvoiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, Long> {
    java.util.Optional<InvoiceItem> findByRefId(Long refId);
}
