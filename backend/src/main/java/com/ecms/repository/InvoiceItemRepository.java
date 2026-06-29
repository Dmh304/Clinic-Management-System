// DucTKH
// Repository cho Entity InvoiceItem, hỗ trợ các thao tác truy xuất chi tiết hóa đơn từ database.
package com.ecms.repository;

import com.ecms.entity.InvoiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, Long> {
    
    // Tìm chi tiết hóa đơn dựa vào mã gốc (Ví dụ: PrescriptionItemId)
    java.util.Optional<InvoiceItem> findFirstByRefId(Long refId);

    // Lấy toàn bộ chi tiết thuộc về một hóa đơn
    List<InvoiceItem> findByInvoice_Id(Long invoiceId);
}
